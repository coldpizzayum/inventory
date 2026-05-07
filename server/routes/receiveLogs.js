import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id, date, part_id, limit: limitParam } = req.query

    // Use range filter for cross-DB date compatibility (avoids DATE() dialect issues)
    let sql = `
      SELECT r.*, p.name as product_name, pt.name as part_name
      FROM receive_logs r
      LEFT JOIN products p  ON p.id  = r.product_id
      LEFT JOIN parts    pt ON pt.id = r.part_id
      WHERE 1=1
    `
    const params = []

    if (product_id) { sql += ' AND r.product_id=?';  params.push(product_id) }
    if (part_id)    { sql += ' AND r.part_id=?';      params.push(part_id) }
    if (date) {
      // date = 'YYYY-MM-DD' → filter logged_at in that day
      sql += ' AND r.logged_at >= ? AND r.logged_at < ?'
      params.push(`${date} 00:00:00`, `${date} 23:59:59`)
    }

    sql += ' ORDER BY r.logged_at DESC'
    if (limitParam) sql += ` LIMIT ${parseInt(limitParam, 10)}`

    const rows = await db.prepare(sql).all(...params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id, part_id, sku_color, action_type, qty, defect_qty, note } = req.body
    if (!action_type || qty === undefined) return res.status(400).json({ error: '缺少必要欄位' })

    const id = await db.transaction(async (txDb) => {
      const result = await txDb.prepare(
        'INSERT INTO receive_logs (product_id, part_id, sku_color, action_type, qty, defect_qty, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(product_id || null, part_id || null, sku_color || '', action_type, qty, defect_qty || 0, note || '')

      if (part_id) {
        const stages = await txDb.prepare(
          'SELECT * FROM process_stages WHERE part_id=? ORDER BY sort_order'
        ).all(part_id)

        if (stages.length > 0) {
          const stage = stages[0]

          if (action_type === 'receive') {
            await txDb.prepare(
              'UPDATE process_stages SET current_stock=current_stock+? WHERE id=?'
            ).run(qty, stage.id)

          } else if (action_type === 'send') {
            // CASE WHEN avoids MAX(0,x) which is SQLite-only syntax
            await txDb.prepare(
              'UPDATE process_stages SET current_stock=CASE WHEN current_stock>=? THEN current_stock-? ELSE 0 END, total_sent=total_sent+? WHERE id=?'
            ).run(qty, qty, qty, stage.id)
            if (defect_qty) await txDb.prepare(
              'UPDATE process_stages SET total_defect=total_defect+? WHERE id=?'
            ).run(defect_qty, stage.id)

          } else if (action_type === 'return') {
            await txDb.prepare(
              'UPDATE process_stages SET current_stock=current_stock+?, total_returned=total_returned+? WHERE id=?'
            ).run(qty, qty, stage.id)
            if (defect_qty) await txDb.prepare(
              'UPDATE process_stages SET total_defect=total_defect+? WHERE id=?'
            ).run(defect_qty, stage.id)

          } else if (action_type === 'ship') {
            await txDb.prepare(
              'UPDATE process_stages SET current_stock=CASE WHEN current_stock>=? THEN current_stock-? ELSE 0 END WHERE id=?'
            ).run(qty, qty, stage.id)
          }
        }
      }

      return result.lastInsertRowid
    })

    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
