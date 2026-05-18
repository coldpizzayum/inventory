import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { status, product_id } = req.query

    let sql = `
      SELECT dl.*,
        p.name  as product_name,
        pt.name as part_name,
        ps.factory_name || ' · ' || ps.action_name as stage_name
      FROM defect_logs dl
      LEFT JOIN products       p  ON p.id  = dl.product_id
      LEFT JOIN parts          pt ON pt.id = dl.part_id
      LEFT JOIN process_stages ps ON ps.id = dl.stage_id
      WHERE 1=1
    `
    const params = []
    if (status)     { sql += ' AND dl.status=?';     params.push(status) }
    if (product_id) { sql += ' AND dl.product_id=?'; params.push(product_id) }
    sql += ' ORDER BY dl.created_at DESC'

    const rows = await db.prepare(sql).all(...params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
