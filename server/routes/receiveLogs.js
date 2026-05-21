import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const { product_id, date, part_id, limit: limitParam } = req.query

    let sql = `
      SELECT r.*,
        w.name  as worker_name,
        p.name  as product_name,
        pt.name as part_name,
        ps.factory_name || ' · ' || ps.action_name as stage_name
      FROM receive_logs r
      LEFT JOIN workers         w  ON w.id  = r.worker_id
      LEFT JOIN products        p  ON p.id  = r.product_id
      LEFT JOIN parts           pt ON pt.id = r.part_id
      LEFT JOIN process_stages  ps ON ps.id = r.stage_id
      WHERE 1=1
    `
    const params = []

    if (product_id) { sql += ' AND r.product_id=?'; params.push(product_id) }
    if (part_id)    { sql += ' AND r.part_id=?';    params.push(part_id) }
    if (date) {
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
    const { product_id, part_id, stage_id, sku_color, action_type, qty, defect_qty, note, worker_id, logged_at } = req.body
    if (!action_type || qty === undefined) return res.status(400).json({ error: '缺少必要欄位' })

    const dq = Math.max(0, defect_qty || 0)
    const net = qty - dq

    const id = await db.transaction(async (tx) => {
      const result = logged_at
        ? await tx.prepare(
            'INSERT INTO receive_logs (product_id, part_id, stage_id, sku_color, action_type, qty, defect_qty, note, worker_id, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(product_id || null, part_id || null, stage_id || null, sku_color || '', action_type, qty, dq, note || '', worker_id || null, logged_at)
        : await tx.prepare(
            'INSERT INTO receive_logs (product_id, part_id, stage_id, sku_color, action_type, qty, defect_qty, note, worker_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(product_id || null, part_id || null, stage_id || null, sku_color || '', action_type, qty, dq, note || '', worker_id || null)

      const logId = result.lastInsertRowid

      if (action_type === 'receive') {
        await tx.prepare(
          'UPDATE parts SET warehouse_stock=warehouse_stock+?, defect_stock=defect_stock+?, total_defect=total_defect+? WHERE id=?'
        ).run(net, dq, dq, part_id)

        if (dq > 0) {
          await tx.prepare(
            'INSERT INTO defect_logs (product_id, part_id, stage_id, sku_color, qty, status, source, receive_log_id) VALUES (?, ?, NULL, ?, ?, \'pending\', \'incoming\', ?)'
          ).run(product_id || null, part_id, sku_color || '', dq, logId)
        }

      } else if (action_type === 'send') {
        await tx.prepare(
          'UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END WHERE id=?'
        ).run(qty, qty, part_id)

        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=in_transit+?, total_sent=total_sent+? WHERE id=?'
          ).run(qty, qty, stage_id)
        }

      } else if (action_type === 'ship') {
        // Finished goods out to customer — deduct from warehouse
        await tx.prepare(
          'UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END WHERE id=?'
        ).run(qty, qty, part_id)

      } else if (action_type === 'return') {
        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_returned=total_returned+?, total_defect=total_defect+? WHERE id=?'
          ).run(qty, qty, qty, dq, stage_id)
        }

        await tx.prepare(
          'UPDATE parts SET warehouse_stock=warehouse_stock+?, defect_stock=defect_stock+?, total_defect=total_defect+? WHERE id=?'
        ).run(net, dq, dq, part_id)

        if (dq > 0) {
          await tx.prepare(
            'INSERT INTO defect_logs (product_id, part_id, stage_id, sku_color, qty, status, source, receive_log_id) VALUES (?, ?, ?, ?, ?, \'pending\', \'return\', ?)'
          ).run(product_id || null, part_id, stage_id || null, sku_color || '', dq, logId)
        }

      } else if (action_type === 'rework') {
        await tx.prepare(
          'UPDATE parts SET defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END WHERE id=?'
        ).run(qty, qty, part_id)

        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=in_transit+?, total_sent=total_sent+? WHERE id=?'
          ).run(qty, qty, stage_id)

          await tx.prepare(`
            UPDATE defect_logs SET status='reworking'
            WHERE id IN (
              SELECT id FROM defect_logs
              WHERE part_id=? AND status='pending'
              ORDER BY created_at ASC LIMIT ?
            )
          `).run(part_id, qty)
        }

      } else if (action_type === 'scrap') {
        await tx.prepare(
          'UPDATE parts SET defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_scrapped=total_scrapped+? WHERE id=?'
        ).run(qty, qty, qty, part_id)

        await tx.prepare(`
          UPDATE defect_logs SET status='scrapped'
          WHERE id IN (
            SELECT id FROM defect_logs
            WHERE part_id=? AND status='pending'
            ORDER BY created_at ASC LIMIT ?
          )
        `).run(part_id, qty)
      }

      return logId
    })

    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const db = getDb()

    // Simple note-only update (batch note feature)
    if (!req.body.action_type) {
      await db.prepare('UPDATE receive_logs SET note=? WHERE id=?').run(req.body.note ?? '', req.params.id)
      return res.json({ ok: true })
    }

    const { action_type, part_id, stage_id, sku_color, qty, defect_qty, note, worker_id, logged_at } = req.body
    const newDq = Math.max(0, defect_qty || 0)
    const newNet = qty - newDq

    const orig = await db.prepare('SELECT * FROM receive_logs WHERE id=?').get(req.params.id)
    if (!orig) return res.status(404).json({ error: '找不到紀錄' })

    await db.transaction(async (tx) => {
      const { action_type: oa, part_id: op, stage_id: os, qty: oq, defect_qty: odq, id: oid } = orig
      const odq_ = odq || 0
      const onet = oq - odq_

      // Reverse original stock effects
      if (oa === 'receive') {
        await tx.prepare('UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END, defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?')
          .run(onet, onet, odq_, odq_, odq_, odq_, op)
        await tx.prepare('DELETE FROM defect_logs WHERE receive_log_id=? AND status=?').run(oid, 'pending')
      } else if (oa === 'send') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+? WHERE id=?').run(oq, op)
        if (os) await tx.prepare('UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_sent=CASE WHEN total_sent>=? THEN total_sent-? ELSE 0 END WHERE id=?').run(oq, oq, oq, oq, os)
      } else if (oa === 'ship') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+? WHERE id=?').run(oq, op)
      } else if (oa === 'return') {
        await tx.prepare('UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END, defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?')
          .run(onet, onet, odq_, odq_, odq_, odq_, op)
        if (os) await tx.prepare('UPDATE process_stages SET in_transit=in_transit+?, total_returned=CASE WHEN total_returned>=? THEN total_returned-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?')
          .run(oq, oq, oq, odq_, odq_, os)
        await tx.prepare('DELETE FROM defect_logs WHERE receive_log_id=? AND status=?').run(oid, 'pending')
      } else if (oa === 'rework') {
        await tx.prepare('UPDATE parts SET defect_stock=defect_stock+? WHERE id=?').run(oq, op)
        if (os) await tx.prepare('UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_sent=CASE WHEN total_sent>=? THEN total_sent-? ELSE 0 END WHERE id=?').run(oq, oq, oq, oq, os)
      } else if (oa === 'scrap') {
        await tx.prepare('UPDATE parts SET defect_stock=defect_stock+?, total_scrapped=CASE WHEN total_scrapped>=? THEN total_scrapped-? ELSE 0 END WHERE id=?').run(oq, oq, oq, op)
      }

      // Apply new stock effects
      if (action_type === 'receive') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+?, defect_stock=defect_stock+?, total_defect=total_defect+? WHERE id=?')
          .run(newNet, newDq, newDq, part_id)
        if (newDq > 0) {
          await tx.prepare('INSERT INTO defect_logs (product_id, part_id, stage_id, sku_color, qty, status, source, receive_log_id) VALUES (?, ?, NULL, ?, ?, \'pending\', \'incoming\', ?)')
            .run(orig.product_id, part_id, sku_color || '', newDq, oid)
        }
      } else if (action_type === 'send') {
        await tx.prepare('UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END WHERE id=?').run(qty, qty, part_id)
        if (stage_id) await tx.prepare('UPDATE process_stages SET in_transit=in_transit+?, total_sent=total_sent+? WHERE id=?').run(qty, qty, stage_id)
      } else if (action_type === 'ship') {
        await tx.prepare('UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END WHERE id=?').run(qty, qty, part_id)
      } else if (action_type === 'return') {
        if (stage_id) await tx.prepare('UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_returned=total_returned+?, total_defect=total_defect+? WHERE id=?').run(qty, qty, qty, newDq, stage_id)
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+?, defect_stock=defect_stock+?, total_defect=total_defect+? WHERE id=?').run(newNet, newDq, newDq, part_id)
        if (newDq > 0) {
          await tx.prepare('INSERT INTO defect_logs (product_id, part_id, stage_id, sku_color, qty, status, source, receive_log_id) VALUES (?, ?, ?, ?, ?, \'pending\', \'return\', ?)')
            .run(orig.product_id, part_id, stage_id || null, sku_color || '', newDq, oid)
        }
      } else if (action_type === 'rework') {
        await tx.prepare('UPDATE parts SET defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END WHERE id=?').run(qty, qty, part_id)
        if (stage_id) await tx.prepare('UPDATE process_stages SET in_transit=in_transit+?, total_sent=total_sent+? WHERE id=?').run(qty, qty, stage_id)
      } else if (action_type === 'scrap') {
        await tx.prepare('UPDATE parts SET defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_scrapped=total_scrapped+? WHERE id=?').run(qty, qty, qty, part_id)
      }

      // Update the record
      await tx.prepare('UPDATE receive_logs SET action_type=?, part_id=?, stage_id=?, sku_color=?, qty=?, defect_qty=?, note=?, worker_id=?, logged_at=? WHERE id=?')
        .run(action_type, part_id || null, stage_id || null, sku_color || '', qty, newDq, note || '', worker_id || null, logged_at || orig.logged_at, oid)
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const db = getDb()
    const log = await db.prepare('SELECT * FROM receive_logs WHERE id=?').get(req.params.id)
    if (!log) return res.status(404).json({ error: '找不到紀錄' })

    await db.transaction(async (tx) => {
      const { action_type, part_id, stage_id, qty, defect_qty, id } = log
      const dq = defect_qty || 0
      const net = qty - dq

      if (action_type === 'receive') {
        await tx.prepare(
          'UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END, defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?'
        ).run(net, net, dq, dq, dq, dq, part_id)
        await tx.prepare('DELETE FROM defect_logs WHERE receive_log_id=?').run(id)

      } else if (action_type === 'send') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+? WHERE id=?').run(qty, part_id)
        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_sent=CASE WHEN total_sent>=? THEN total_sent-? ELSE 0 END WHERE id=?'
          ).run(qty, qty, qty, qty, stage_id)
        }

      } else if (action_type === 'ship') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+? WHERE id=?').run(qty, part_id)

      } else if (action_type === 'return') {
        await tx.prepare(
          'UPDATE parts SET warehouse_stock=CASE WHEN warehouse_stock>=? THEN warehouse_stock-? ELSE 0 END, defect_stock=CASE WHEN defect_stock>=? THEN defect_stock-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?'
        ).run(net, net, dq, dq, dq, dq, part_id)
        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=in_transit+?, total_returned=CASE WHEN total_returned>=? THEN total_returned-? ELSE 0 END, total_defect=CASE WHEN total_defect>=? THEN total_defect-? ELSE 0 END WHERE id=?'
          ).run(qty, qty, qty, dq, dq, stage_id)
        }
        await tx.prepare('DELETE FROM defect_logs WHERE receive_log_id=?').run(id)

      } else if (action_type === 'rework') {
        await tx.prepare('UPDATE parts SET defect_stock=defect_stock+? WHERE id=?').run(qty, part_id)
        if (stage_id) {
          await tx.prepare(
            'UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_sent=CASE WHEN total_sent>=? THEN total_sent-? ELSE 0 END WHERE id=?'
          ).run(qty, qty, qty, qty, stage_id)
        }

      } else if (action_type === 'scrap') {
        await tx.prepare(
          'UPDATE parts SET defect_stock=defect_stock+?, total_scrapped=CASE WHEN total_scrapped>=? THEN total_scrapped-? ELSE 0 END WHERE id=?'
        ).run(qty, qty, qty, part_id)
      }

      await tx.prepare('DELETE FROM receive_logs WHERE id=?').run(id)
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
