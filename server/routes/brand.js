import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

function getPartStatus(stages) {
  if (!stages || stages.length === 0) return '等待中'
  if (stages.some(s => (s.in_transit || 0) > 0)) return '加工中'
  const maxSort = Math.max(...stages.map(x => x.sort_order || 0))
  if (stages.some(s => (s.total_returned || 0) > 0 && (s.sort_order || 0) === maxSort)) return '已回廠'
  if (stages.some(s => (s.total_sent || 0) > 0)) return '備料中'
  return '等待中'
}

function deriveProductStatus(parts) {
  if (!parts || parts.length === 0) return '等待中'
  const statuses = parts.map(p => p.status)
  if (statuses.includes('加工中')) return '加工中'
  if (statuses.includes('備料中')) return '送加工廠'
  if (statuses.every(s => s === '已回廠')) return '包裝中'
  return '等待中'
}

async function getProductProgress(db, productId) {
  const product = await db.prepare(
    'SELECT id, name, description, order_qty, order_date, estimated_completion, image_url, COALESCE(warehouse_stock, 0) as warehouse_stock FROM products WHERE id=?'
  ).get(productId)
  if (!product) return null

  const parts = await db.prepare(
    'SELECT id, name, sort_order FROM parts WHERE product_id=? ORDER BY sort_order'
  ).all(product.id)

  if (parts.length === 0) return { product, parts: [], overallStatus: '等待中' }

  const partIds = parts.map(p => p.id)
  const ph = partIds.map(() => '?').join(',')

  const [skus, stages] = await Promise.all([
    db.prepare(`SELECT part_id, color_name, color_hex FROM part_skus WHERE part_id IN (${ph})`).all(...partIds),
    db.prepare(`SELECT part_id, in_transit, total_sent, total_returned, sort_order FROM process_stages WHERE part_id IN (${ph})`).all(...partIds),
  ])

  const partsResult = parts.map(part => {
    const partStages = stages.filter(s => s.part_id === part.id)
    const status = getPartStatus(partStages)
    const partSkus = skus.filter(s => s.part_id === part.id).map(s => ({
      color_name: s.color_name,
      color_hex: s.color_hex || null,
    }))
    return { id: part.id, name: part.name, status, skus: partSkus }
  })

  return { product, parts: partsResult, overallStatus: deriveProductStatus(partsResult) }
}

router.get('/:token', async (req, res) => {
  try {
    const db = getDb()
    const brand = await db.prepare('SELECT * FROM brands WHERE token=?').get(req.params.token)
    if (!brand) return res.status(404).json({ error: '無效的設計師連結' })

    const assignedProducts = await db.prepare(
      'SELECT product_id FROM brand_products WHERE brand_id=?'
    ).all(brand.id)

    const items = await Promise.all(assignedProducts.map(r => getProductProgress(db, r.product_id)))
    const products = items.filter(Boolean)

    let orders = []
    const productIds = assignedProducts.map(r => r.product_id)
    if (productIds.length > 0) {
      try {
        const ph = productIds.map(() => '?').join(',')
        orders = await db.prepare(
          `SELECT o.id, o.product_id, o.target_qty, o.completed_qty, o.due_date, o.created_at,
                  p.name as product_name
           FROM orders o JOIN products p ON p.id = o.product_id
           WHERE o.product_id IN (${ph}) ORDER BY o.due_date`
        ).all(...productIds)
      } catch (_) {}
    }

    res.json({ brand_name: brand.name, products, orders })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
