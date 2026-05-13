import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

const STATUS_MAP = { receive: '送加工廠', send: '加工中', return: '包裝中', ship: '完成' }

async function getProductProgress(db, productId) {
  const product = await db.prepare(
    'SELECT id, name, description, order_qty, order_date, estimated_completion FROM products WHERE id=?'
  ).get(productId)
  if (!product) return null

  const parts = await db.prepare('SELECT * FROM parts WHERE product_id=? ORDER BY sort_order').all(product.id)
  const partIds = parts.map(p => p.id)

  const skus = partIds.length
    ? await db.prepare(`SELECT * FROM part_skus WHERE part_id IN (${partIds.map(() => '?').join(',')})`).all(...partIds)
    : []

  const partsResult = await Promise.all(parts.map(async (part) => {
    const lastLog = await db.prepare(
      'SELECT action_type FROM receive_logs WHERE part_id=? ORDER BY logged_at DESC LIMIT 1'
    ).get(part.id)
    const status = lastLog ? (STATUS_MAP[lastLog.action_type] || '等待中') : '等待中'

    const partSkus = skus.filter(s => s.part_id === part.id)
    const skuProgress = await Promise.all(partSkus.map(async (sku) => {
      const skuLog = await db.prepare(
        'SELECT action_type FROM receive_logs WHERE part_id=? AND sku_color=? ORDER BY logged_at DESC LIMIT 1'
      ).get(part.id, sku.color_name)
      return { color_name: sku.color_name, status: skuLog ? (STATUS_MAP[skuLog.action_type] || '等待中') : '等待中' }
    }))

    return { id: part.id, name: part.name, status, sku_progress: skuProgress }
  }))

  return { product, parts: partsResult }
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

    res.json({ brand_name: brand.name, products })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
