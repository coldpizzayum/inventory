import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const factories = await db.prepare('SELECT * FROM factories ORDER BY sort_order, name').all()
    res.json(factories)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, specialty, phone, contact_name, address, note } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: '廠商名稱必填' })
    const result = await db.prepare(
      'INSERT INTO factories (name, specialty, phone, contact_name, address, note, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name.trim(), specialty || '', phone || '', contact_name || '', address || '', note || '', 'active')
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, specialty, phone, contact_name, address, note } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: '廠商名稱必填' })
    await db.prepare(
      'UPDATE factories SET name=?, specialty=?, phone=?, contact_name=?, address=?, note=?, updated_at=? WHERE id=?'
    ).run(name.trim(), specialty || '', phone || '', contact_name || '', address || '', note || '', new Date().toISOString(), req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { status } = req.body
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: '狀態值錯誤' })
    await db.prepare('UPDATE factories SET status=?, updated_at=? WHERE id=?').run(status, new Date().toISOString(), req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
