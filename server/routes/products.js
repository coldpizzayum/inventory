import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const products = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
    res.json(products)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, description, order_qty, order_date, estimated_completion } = req.body
    if (!name) return res.status(400).json({ error: '產品名稱必填' })
    const id = uuidv4()
    await db.prepare(
      'INSERT INTO products (id, name, description, order_qty, order_date, estimated_completion) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, description || '', order_qty || 0, order_date || '', estimated_completion || '')
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, description, order_qty, order_date, estimated_completion } = req.body
    await db.prepare(
      'UPDATE products SET name=?, description=?, order_qty=?, order_date=?, estimated_completion=? WHERE id=?'
    ).run(name, description, order_qty, order_date, estimated_completion, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/parts', async (req, res) => {
  try {
    const db = getDb()
    const parts = await db.prepare('SELECT * FROM parts WHERE product_id=? ORDER BY sort_order').all(req.params.id)
    const partIds = parts.map(p => p.id)

    const [skus, stages] = partIds.length
      ? await Promise.all([
          db.prepare(`SELECT * FROM part_skus WHERE part_id IN (${partIds.map(() => '?').join(',')}) ORDER BY id`).all(...partIds),
          db.prepare(`SELECT * FROM process_stages WHERE part_id IN (${partIds.map(() => '?').join(',')}) ORDER BY sort_order`).all(...partIds),
        ])
      : [[], []]

    const result = parts.map(part => ({
      ...part,
      skus:   skus.filter(s => s.part_id === part.id),
      stages: stages.filter(s => s.part_id === part.id),
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
