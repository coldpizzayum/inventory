import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id } = req.query
    let sql = 'SELECT pi.*, p.name as product_name FROM packing_items pi JOIN products p ON p.id=pi.product_id WHERE 1=1'
    const params = []
    if (product_id) { sql += ' AND pi.product_id=?'; params.push(product_id) }
    sql += ' ORDER BY pi.id'
    res.json(await db.prepare(sql).all(...params))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { product_id, name, supplier, stock } = req.body
    if (!product_id || !name) return res.status(400).json({ error: '缺少必要欄位' })
    const result = await db.prepare(
      'INSERT INTO packing_items (product_id, name, supplier, stock) VALUES (?, ?, ?, ?)'
    ).run(product_id, name, supplier || '', stock || 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, supplier, stock, month_in, month_out, defect } = req.body
    await db.prepare(
      'UPDATE packing_items SET name=?, supplier=?, stock=?, month_in=?, month_out=?, defect=? WHERE id=?'
    ).run(name, supplier || '', stock || 0, month_in || 0, month_out || 0, defect || 0, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM packing_items WHERE id=?').run(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
