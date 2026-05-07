import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const db = getDb()
  const { product_id, date, part_id, limit: limitParam } = req.query
  let sql = `
    SELECT r.*, p.name as product_name, pt.name as part_name
    FROM receive_logs r
    LEFT JOIN products p ON p.id = r.product_id
    LEFT JOIN parts pt ON pt.id = r.part_id
    WHERE 1=1
  `
  const params = []
  if (product_id) { sql += ' AND r.product_id=?'; params.push(product_id) }
  if (part_id)    { sql += ' AND r.part_id=?';    params.push(part_id) }
  if (date)       { sql += ' AND DATE(r.logged_at)=?'; params.push(date) }
  sql += ' ORDER BY r.logged_at DESC'
  if (limitParam) { sql += ` LIMIT ${parseInt(limitParam, 10)}` }
  const rows = db.prepare(sql).all(...params)
  res.json(rows)
})

router.post('/', (req, res) => {
  const db = getDb()
  const { product_id, part_id, sku_color, action_type, qty, defect_qty, note } = req.body
  if (!action_type || qty === undefined) return res.status(400).json({ error: '缺少必要欄位' })

  const insertLog = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO receive_logs (product_id, part_id, sku_color, action_type, qty, defect_qty, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(product_id || null, part_id || null, sku_color || '', action_type, qty, defect_qty || 0, note || '')

    if (part_id) {
      const stages = db.prepare('SELECT * FROM process_stages WHERE part_id=? ORDER BY sort_order').all(part_id)
      if (stages.length > 0) {
        const stage = stages[0]
        if (action_type === 'receive') {
          db.prepare('UPDATE process_stages SET current_stock=current_stock+? WHERE id=?').run(qty, stage.id)
        } else if (action_type === 'send') {
          db.prepare('UPDATE process_stages SET current_stock=MAX(0,current_stock-?), total_sent=total_sent+? WHERE id=?').run(qty, qty, stage.id)
          if (defect_qty) db.prepare('UPDATE process_stages SET total_defect=total_defect+? WHERE id=?').run(defect_qty, stage.id)
        } else if (action_type === 'return') {
          db.prepare('UPDATE process_stages SET current_stock=current_stock+?, total_returned=total_returned+? WHERE id=?').run(qty, qty, stage.id)
          if (defect_qty) db.prepare('UPDATE process_stages SET total_defect=total_defect+? WHERE id=?').run(defect_qty, stage.id)
        } else if (action_type === 'ship') {
          db.prepare('UPDATE process_stages SET current_stock=MAX(0,current_stock-?) WHERE id=?').run(qty, stage.id)
        }
      }
    }

    return result.lastInsertRowid
  })

  const id = insertLog()
  res.status(201).json({ id })
})

export default router
