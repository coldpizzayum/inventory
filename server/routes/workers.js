import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const workers = await db.prepare('SELECT * FROM workers WHERE is_active=? ORDER BY name').all(1)
    res.json(workers)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: '名字必填' })
    const result = await db.prepare('INSERT INTO workers (name) VALUES (?)').run(name.trim())
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: '名字必填' })
    await db.prepare('UPDATE workers SET name=? WHERE id=?').run(name.trim(), req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('UPDATE workers SET is_active=? WHERE id=?').run(0, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
