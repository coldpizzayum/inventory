import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// 「待點貨品檢」清單 —— qty>0 代表還沒被分批點完。可用 product_id 篩選，
// 跟 LogPage 既有的「待處理不良品」(defect-logs) 篩選方式一致。
router.get('/pending', async (req, res) => {
  try {
    const db = getDb()
    const { product_id } = req.query
    let sql = `
      SELECT q.*,
        p.name  as product_name,
        pt.name as part_name,
        ps.factory_name || ' · ' || ps.action_name as stage_name
      FROM qc_pending q
      LEFT JOIN products       p  ON p.id  = q.product_id
      LEFT JOIN parts          pt ON pt.id = q.part_id
      LEFT JOIN process_stages ps ON ps.id = q.stage_id
      WHERE q.qty > 0
    `
    const params = []
    if (product_id) { sql += ' AND q.product_id=?'; params.push(product_id) }
    sql += ' ORDER BY q.created_at ASC'

    const rows = await db.prepare(sql).all(...params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 品檢登記 —— 零件從加工廠回來，先暫存在 qc_pending，不直接進 warehouse_stock
// 或 defect_stock（還沒分好良品/不良品)。同時寫一筆 receive_logs(action_type='qc')
// 讓「最近紀錄」時間軸看得到這個事件，並把該加工站的 in_transit 扣掉。
router.post('/pending', async (req, res) => {
  try {
    const db = getDb()
    const { product_id, part_id, stage_id, sku_color, qty, note, worker_id, logged_at } = req.body
    if (!part_id || !qty || qty <= 0) return res.status(400).json({ error: '缺少必要欄位' })

    if (!sku_color) {
      const skuCount = await db.prepare('SELECT COUNT(*) as c FROM part_skus WHERE part_id=?').get(part_id)
      if ((skuCount?.c || 0) > 1) return res.status(400).json({ error: '此零件有多個 SKU 顏色，請選擇顏色' })
    }

    const id = await db.transaction(async (tx) => {
      const logResult = logged_at
        ? await tx.prepare(
            'INSERT INTO receive_logs (product_id, part_id, stage_id, sku_color, action_type, qty, note, worker_id, logged_at) VALUES (?, ?, ?, ?, \'qc\', ?, ?, ?, ?)'
          ).run(product_id || null, part_id, stage_id || null, sku_color || '', qty, note || '', worker_id || null, logged_at)
        : await tx.prepare(
            'INSERT INTO receive_logs (product_id, part_id, stage_id, sku_color, action_type, qty, note, worker_id) VALUES (?, ?, ?, ?, \'qc\', ?, ?, ?)'
          ).run(product_id || null, part_id, stage_id || null, sku_color || '', qty, note || '', worker_id || null)

      const logId = logResult.lastInsertRowid

      const pendingResult = await tx.prepare(
        'INSERT INTO qc_pending (product_id, part_id, stage_id, sku_color, qty, source_log_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(product_id || null, part_id, stage_id || null, sku_color || '', qty, logId, note || '')

      if (stage_id) {
        await tx.prepare(
          'UPDATE process_stages SET in_transit=CASE WHEN in_transit>=? THEN in_transit-? ELSE 0 END, total_returned=total_returned+? WHERE id=?'
        ).run(qty, qty, qty, stage_id)
      }

      return pendingResult.lastInsertRowid
    })

    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 分批點貨 —— 把暫存的一部分數量分類成入庫/重工/報廢，剩下的留在 qc_pending
// 繼續等下一批處理。'pending'（繼續待點）只記錄一筆 qc_logs 當作查看紀錄，
// 不動 qc_pending 的數量，也不動任何庫存（這部分還沒做決定，數量不能憑空消失）。
router.post('/pending/:id/process', async (req, res) => {
  try {
    const db = getDb()
    const { qty, action, rework_stage_id, worker_id, note } = req.body
    if (!qty || qty <= 0) return res.status(400).json({ error: '請輸入正確數量' })
    if (!['stock', 'rework', 'scrap', 'pending'].includes(action)) return res.status(400).json({ error: '處理方式錯誤' })
    if (action === 'rework' && !rework_stage_id) return res.status(400).json({ error: '請選擇重工站' })

    const pending = await db.prepare('SELECT * FROM qc_pending WHERE id=?').get(req.params.id)
    if (!pending) return res.status(404).json({ error: '找不到品檢暫存紀錄' })
    if (qty > pending.qty) return res.status(400).json({ error: '數量超過待點貨件數' })

    await db.transaction(async (tx) => {
      await tx.prepare(
        'INSERT INTO qc_logs (qc_pending_id, product_id, part_id, sku_color, qty, action, rework_stage_id, worker_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(pending.id, pending.product_id, pending.part_id, pending.sku_color || '', qty, action, rework_stage_id || null, worker_id || null, note || '')

      if (action !== 'pending') {
        await tx.prepare('UPDATE qc_pending SET qty=qty-?, updated_at=? WHERE id=?')
          .run(qty, new Date().toISOString(), pending.id)
      }

      if (action === 'stock') {
        await tx.prepare('UPDATE parts SET warehouse_stock=warehouse_stock+? WHERE id=?').run(qty, pending.part_id)
      } else if (action === 'rework') {
        await tx.prepare('UPDATE process_stages SET in_transit=in_transit+?, total_sent=total_sent+? WHERE id=?')
          .run(qty, qty, rework_stage_id)
      } else if (action === 'scrap') {
        await tx.prepare('UPDATE parts SET total_scrapped=total_scrapped+? WHERE id=?').run(qty, pending.part_id)
      }
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
