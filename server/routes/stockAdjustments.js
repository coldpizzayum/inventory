import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id, limit } = req.query
    let sql = 'SELECT * FROM stock_adjustments WHERE 1=1'
    const params = []
    if (product_id) { sql += ' AND product_id=?'; params.push(product_id) }
    sql += ' ORDER BY adjusted_at DESC'
    if (limit && limit !== 'all') { sql += ' LIMIT ?'; params.push(parseInt(limit)) }
    const rows = await db.prepare(sql).all(...params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { product_id, new_qty, reason, adjusted_by = 'admin' } = req.body
    if (!product_id || new_qty == null || !reason) {
      return res.status(400).json({ error: '缺少必要欄位' })
    }

    const product = await db.prepare('SELECT id, warehouse_stock FROM products WHERE id=?').get(product_id)
    if (!product) return res.status(404).json({ error: '產品不存在' })

    const previous_qty = product.warehouse_stock || 0
    const diff = new_qty - previous_qty
    const newStock = Math.max(0, new_qty)

    await db.prepare('UPDATE products SET warehouse_stock=? WHERE id=?').run(newStock, product_id)

    const result = await db.prepare(
      'INSERT INTO stock_adjustments (product_id, previous_qty, new_qty, diff, reason, adjusted_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(product_id, previous_qty, newStock, diff, reason, adjusted_by)

    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
