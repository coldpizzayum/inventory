import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id } = req.query
    if (!product_id) return res.status(400).json({ error: '缺少 product_id' })
    const rows = await db.prepare('SELECT * FROM sub_assemblies WHERE product_id=? ORDER BY tier, code').all(product_id)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/assemble', async (req, res) => {
  try {
    const db = getDb()
    const { quantity, note } = req.body
    if (!quantity || quantity <= 0) return res.status(400).json({ error: '數量必須是正整數' })
    const row = await db.prepare('SELECT * FROM fn_assemble_sub_assembly(?, ?, ?)').get(req.params.id, quantity, note || '')
    res.json(row || { ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
