import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/', requireAuth, (req, res) => {
  const db = getDb()
  const { product_id, name, sort_order } = req.body
  if (!product_id || !name) return res.status(400).json({ error: '缺少必要欄位' })
  const id = uuidv4()
  db.prepare('INSERT INTO parts (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)').run(id, product_id, name, sort_order || 0)
  res.status(201).json({ id })
})

router.put('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const { name, sort_order } = req.body
  db.prepare('UPDATE parts SET name=?, sort_order=? WHERE id=?').run(name, sort_order || 0, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM part_skus WHERE part_id=?').run(req.params.id)
  db.prepare('DELETE FROM process_stages WHERE part_id=?').run(req.params.id)
  db.prepare('DELETE FROM parts WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

router.post('/:id/skus', requireAuth, (req, res) => {
  const db = getDb()
  const { color_name } = req.body
  if (!color_name) return res.status(400).json({ error: '顏色名稱必填' })
  const result = db.prepare('INSERT INTO part_skus (part_id, color_name) VALUES (?, ?)').run(req.params.id, color_name)
  res.status(201).json({ id: result.lastInsertRowid })
})

router.delete('/:partId/skus/:skuId', requireAuth, (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM part_skus WHERE id=? AND part_id=?').run(req.params.skuId, req.params.partId)
  res.json({ ok: true })
})

router.post('/:id/stages', requireAuth, (req, res) => {
  const db = getDb()
  const { factory_name, action_name, sort_order } = req.body
  if (!factory_name || !action_name) return res.status(400).json({ error: '缺少必要欄位' })
  const result = db.prepare(
    'INSERT INTO process_stages (part_id, factory_name, action_name, sort_order) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, factory_name, action_name, sort_order || 0)
  res.status(201).json({ id: result.lastInsertRowid })
})

router.delete('/:partId/stages/:stageId', requireAuth, (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM process_stages WHERE id=? AND part_id=?').run(req.params.stageId, req.params.partId)
  res.json({ ok: true })
})

export default router
