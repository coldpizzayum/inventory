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

router.get('/:id/sku-breakdown', async (req, res) => {
  try {
    const db = getDb()
    const rows = await db.prepare(
      `SELECT sku_color, stage_id, action_type, qty FROM receive_logs
       WHERE part_id=? AND action_type IN ('send','return','rework','qc')
         AND stage_id IS NOT NULL`
    ).all(req.params.id)

    // 早期登記沒有強制選顏色，sku_color 可能是 NULL 或空字串——這類歷史紀錄
    // 歸入「未分類」桶，而不是直接排除，避免分色加總對不上加工站的權威在途數
    const breakdown = {}
    const sent = {}
    for (const { sku_color, stage_id, action_type, qty } of rows) {
      const color = sku_color || '未分類'
      if (!breakdown[color]) breakdown[color] = {}
      if (breakdown[color][stage_id] === undefined) breakdown[color][stage_id] = 0
      if (action_type === 'send' || action_type === 'rework') breakdown[color][stage_id] += qty
      if (action_type === 'return') breakdown[color][stage_id] -= qty
      if (action_type === 'send') {
        if (!sent[color]) sent[color] = new Set()
        sent[color].add(stage_id)
      }
    }
    const sentOut = {}
    for (const color in sent) sentOut[color] = [...sent[color]]

    res.json({ breakdown, sent: sentOut })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 依顏色拆解倉庫庫存（parts.warehouse_stock 只有總數，沒有分色）。
// 邏輯跟 warehouse_stock 本身的計算方式一致：receive/return 進倉、send/ship 出倉。
// 另外品檢點貨批次入庫（qc_logs, action='stock'）也會直接加進 warehouse_stock，
// 但寫在 qc_logs 而不是 receive_logs，這裡要一起算，不然分色加總會少算。
router.get('/:id/warehouse-breakdown', async (req, res) => {
  try {
    const db = getDb()
    const rows = await db.prepare(
      `SELECT sku_color, action_type, qty, defect_qty FROM receive_logs
       WHERE part_id=? AND action_type IN ('receive','send','ship','return')`
    ).all(req.params.id)

    const breakdown = {}
    for (const { sku_color, action_type, qty, defect_qty } of rows) {
      const color = sku_color || '未分類'
      if (breakdown[color] === undefined) breakdown[color] = 0
      const net = qty - (defect_qty || 0)
      if (action_type === 'receive' || action_type === 'return') breakdown[color] += net
      if (action_type === 'send' || action_type === 'ship') breakdown[color] -= qty
    }

    const qcRows = await db.prepare(
      `SELECT sku_color, qty FROM qc_logs WHERE part_id=? AND action='stock'`
    ).all(req.params.id)
    for (const { sku_color, qty } of qcRows) {
      const color = sku_color || '未分類'
      if (breakdown[color] === undefined) breakdown[color] = 0
      breakdown[color] += qty
    }

    res.json({ breakdown })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 找出讓「倉庫庫存分色加總」對不起來的原始紀錄——顏色名稱對不上這個零件目前
// 任何一個已註冊 SKU 的 receive_logs 紀錄（通常是顏色改過名，舊紀錄沒跟著更新）。
// 這裡沒有「缺加工站」這個分類，因為倉庫庫存沒有加工站這個維度。
router.get('/:id/warehouse-log-issues', async (req, res) => {
  try {
    const db = getDb()
    const skus = await db.prepare('SELECT color_name FROM part_skus WHERE part_id=?').all(req.params.id)
    const validNames = new Set(skus.map(s => s.color_name))

    const rows = await db.prepare(
      `SELECT id, action_type, stage_id, sku_color, qty, defect_qty, lost_qty, note, worker_id, logged_at, part_id
       FROM receive_logs WHERE part_id=? AND action_type IN ('receive','send','ship','return')
       ORDER BY logged_at ASC`
    ).all(req.params.id)

    const unknownColor = rows.filter(r => r.sku_color && !validNames.has(r.sku_color))

    res.json({ unknownColor })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 找出讓 SKU 分列加總對不起來的原始紀錄，讓使用者可以直接在 UI 上修正：
// 1. noStage —— 送出/回廠/重工/品檢紀錄完全沒有記錄加工站，沒辦法歸到任何一站
// 2. unknownColor —— 有記錄加工站，但顏色名稱對不上這個零件目前任何一個已註冊的
//    SKU（通常是顏色後來改過名，舊紀錄沒有跟著更新）
router.get('/:id/log-issues', async (req, res) => {
  try {
    const db = getDb()
    const skus = await db.prepare('SELECT color_name FROM part_skus WHERE part_id=?').all(req.params.id)
    const validNames = new Set(skus.map(s => s.color_name))

    const rows = await db.prepare(
      `SELECT id, action_type, stage_id, sku_color, qty, defect_qty, lost_qty, note, worker_id, logged_at, part_id
       FROM receive_logs WHERE part_id=? AND action_type IN ('send','return','rework','qc')
       ORDER BY logged_at ASC`
    ).all(req.params.id)

    const noStage = rows.filter(r => !r.stage_id)
    const unknownColor = rows.filter(r => r.stage_id && r.sku_color && !validNames.has(r.sku_color))

    res.json({ noStage, unknownColor })
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
