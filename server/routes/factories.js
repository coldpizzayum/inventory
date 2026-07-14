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

// 合併廠商 —— 把來源廠商的加工紀錄（process_stages.factory_name）改記到目標廠商
// 名下，備註合併進目標廠商，最後刪除來源廠商
router.post('/:id/merge', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { target_id, note } = req.body
    if (!target_id) return res.status(400).json({ error: '請選擇合併目標' })
    if (String(target_id) === String(req.params.id)) return res.status(400).json({ error: '來源與目標不可相同' })

    const source = await db.prepare('SELECT * FROM factories WHERE id=?').get(req.params.id)
    const target = await db.prepare('SELECT * FROM factories WHERE id=?').get(target_id)
    if (!source || !target) return res.status(404).json({ error: '廠商不存在' })
    if (source.name === '廠內') return res.status(400).json({ error: '廠內無法合併' })

    await db.transaction(async (tx) => {
      await tx.prepare('UPDATE process_stages SET factory_name=? WHERE factory_name=?').run(target.name, source.name)
      const trimmedNote = (note || '').trim()
      const mergedNote = trimmedNote ? (target.note ? `${target.note}；${trimmedNote}` : trimmedNote) : target.note
      await tx.prepare('UPDATE factories SET note=?, updated_at=? WHERE id=?').run(mergedNote || '', new Date().toISOString(), target_id)
      await tx.prepare('DELETE FROM factories WHERE id=?').run(req.params.id)
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
