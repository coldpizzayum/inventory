import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

const STATUS_MAP = { receive: '送加工廠', send: '加工中', return: '包裝中', ship: '完成' }

router.get('/:token', (req, res) => {
  const db = getDb()
  const tokenRow = db.prepare('SELECT * FROM designer_tokens WHERE token=?').get(req.params.token)
  if (!tokenRow) return res.status(404).json({ error: '無效的設計師連結' })

  const product = db.prepare(
    'SELECT id, name, description, order_qty, order_date, estimated_completion FROM products WHERE id=?'
  ).get(tokenRow.product_id)
  if (!product) return res.status(404).json({ error: '找不到產品' })

  const parts = db.prepare('SELECT * FROM parts WHERE product_id=? ORDER BY sort_order').all(product.id)
  const partIds = parts.map(p => p.id)

  const skus = partIds.length
    ? db.prepare(`SELECT * FROM part_skus WHERE part_id IN (${partIds.map(() => '?').join(',')})`).all(...partIds)
    : []

  const result = parts.map(part => {
    const lastLog = db.prepare(
      'SELECT action_type, defect_qty, qty FROM receive_logs WHERE part_id=? ORDER BY logged_at DESC LIMIT 1'
    ).get(part.id)

    const status = lastLog ? (STATUS_MAP[lastLog.action_type] || '等待中') : '等待中'

    const totals = db.prepare(
      "SELECT SUM(qty) as total, SUM(defect_qty) as defects FROM receive_logs WHERE part_id=? AND action_type IN ('receive','return')"
    ).get(part.id)
    const hasDefectAlert = totals && totals.total > 0 && (totals.defects / totals.total) > 0.05

    const partSkus = skus.filter(s => s.part_id === part.id)
    const skuProgress = partSkus.map(sku => {
      const skuLog = db.prepare(
        'SELECT action_type FROM receive_logs WHERE part_id=? AND sku_color=? ORDER BY logged_at DESC LIMIT 1'
      ).get(part.id, sku.color_name)
      return {
        color_name: sku.color_name,
        status: skuLog ? (STATUS_MAP[skuLog.action_type] || '等待中') : '等待中'
      }
    })

    return { id: part.id, name: part.name, status, defect_alert: hasDefectAlert ? '有異常' : '正常', sku_progress: skuProgress }
  })

  res.json({
    product: {
      name: product.name,
      description: product.description,
      order_qty: product.order_qty,
      order_date: product.order_date,
      estimated_completion: product.estimated_completion,
    },
    label: tokenRow.label,
    parts: result
  })
})

export default router
