import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const tokens = await db.prepare(`
      SELECT dt.*, p.name as product_name
      FROM designer_tokens dt
      JOIN products p ON p.id = dt.product_id
      ORDER BY dt.created_at DESC
    `).all()
    res.json(tokens)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { product_id, label } = req.body
    if (!product_id) return res.status(400).json({ error: '缺少產品ID' })
    const token = uuidv4().replace(/-/g, '')
    await db.prepare('INSERT INTO designer_tokens (token, product_id, label) VALUES (?, ?, ?)').run(token, product_id, label || '')
    res.status(201).json({ token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM designer_tokens WHERE id=?').run(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
