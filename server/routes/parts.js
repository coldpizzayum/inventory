import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { product_id, name, sort_order } = req.body
    if (!product_id || !name) return res.status(400).json({ error: '缺少必要欄位' })
    const id = uuidv4()
    await db.prepare('INSERT INTO parts (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)').run(id, product_id, name, sort_order || 0)
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, sort_order } = req.body
    await db.prepare('UPDATE parts SET name=?, sort_order=? WHERE id=?').run(name, sort_order || 0, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM part_skus WHERE part_id=?').run(req.params.id)
    await db.prepare('DELETE FROM process_stages WHERE part_id=?').run(req.params.id)
    await db.prepare('DELETE FROM parts WHERE id=?').run(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/skus', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { color_name, color_hex } = req.body
    if (!color_name) return res.status(400).json({ error: '顏色名稱必填' })
    const result = await db.prepare('INSERT INTO part_skus (part_id, color_name, color_hex) VALUES (?, ?, ?)').run(req.params.id, color_name, color_hex || null)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:partId/skus/:skuId', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM part_skus WHERE id=? AND part_id=?').run(req.params.skuId, req.params.partId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/stages', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { factory_name, action_name, sort_order } = req.body
    if (!factory_name || !action_name) return res.status(400).json({ error: '缺少必要欄位' })
    const result = await db.prepare(
      'INSERT INTO process_stages (part_id, factory_name, action_name, sort_order) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, factory_name, action_name, sort_order || 0)
    res.status(201).json({ id: result.lastInsertRowid })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:partId/stages/:stageId', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM process_stages WHERE id=? AND part_id=?').run(req.params.stageId, req.params.partId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:partId/stages/:stageId', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { factory_name, action_name, sort_order } = req.body
    await db.prepare('UPDATE process_stages SET factory_name=?, action_name=?, sort_order=? WHERE id=? AND part_id=?')
      .run(factory_name, action_name, sort_order ?? 0, req.params.stageId, req.params.partId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
