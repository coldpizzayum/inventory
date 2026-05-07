import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const threshold = parseInt(req.query.threshold || '200', 10)
    const stages = await db.prepare(`
      SELECT ps.*, pt.name as part_name, p.name as product_name
      FROM process_stages ps
      JOIN parts    pt ON pt.id = ps.part_id
      JOIN products p  ON p.id  = pt.product_id
      WHERE ps.current_stock < ?
      ORDER BY ps.current_stock ASC
    `).all(threshold)
    res.json(stages)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
