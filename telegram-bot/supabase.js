'use strict'

// This bot never uses Supabase Realtime — only plain REST queries — but the
// client still initializes a RealtimeClient internally, which requires a
// WebSocket implementation on Node < 22. The constructor's `realtime.transport`
// option isn't reliably picked up across @supabase/supabase-js versions, so
// polyfill the global instead — this is what WebSocketFactory actually checks.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws')
}

const { createClient } = require('@supabase/supabase-js')

// Strip trailing slashes / accidental path segments (e.g. "/rest/v1") —
// a malformed SUPABASE_URL causes PGRST125 "Invalid path specified in
// request URL" on every single query, not just nested-select ones.
function sanitizeSupabaseUrl(raw) {
  if (!raw) return raw
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}`
  } catch {
    return raw.replace(/\/+$/, '')
  }
}

const SUPABASE_URL = sanitizeSupabaseUrl(process.env.SUPABASE_URL)
console.log('Supabase URL（清理後）：', SUPABASE_URL)
console.log('globalThis.WebSocket polyfill 已設定：', typeof globalThis.WebSocket !== 'undefined')

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── Reads ────────────────────────────────────────────────────────────────────

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data || []
}

// Returns parts with skus and stages as flat joins (avoids FK relationship requirement)
async function getPartsWithStages(productId) {
  const { data: parts, error: partsErr } = await supabase
    .from('parts')
    .select('id, name, sort_order, warehouse_stock, defect_stock, total_defect, total_lost')
    .eq('product_id', productId)
    .order('sort_order')
  if (partsErr) throw partsErr

  const result = []
  for (const part of (parts || [])) {
    const { data: skus } = await supabase
      .from('part_skus')
      .select('id, color_name')
      .eq('part_id', part.id)

    const { data: stages } = await supabase
      .from('process_stages')
      .select('id, factory_name, action_name, in_transit, total_sent, total_returned, sort_order')
      .eq('part_id', part.id)
      .order('sort_order')

    result.push({ ...part, skus: skus || [], stages: stages || [] })
  }
  return result
}

// Returns the process_stages for one part directly (no product context needed)
async function getStagesForPart(partId) {
  const { data, error } = await supabase
    .from('process_stages')
    .select('id, factory_name, action_name, in_transit, total_sent, total_returned, sort_order')
    .eq('part_id', partId)
    .order('sort_order')
  if (error) throw error
  return data || []
}

async function getAllFactories() {
  const { data, error } = await supabase
    .from('process_stages')
    .select('factory_name, action_name, part_id')
  if (error) throw error
  const seen = new Map()
  for (const d of (data || [])) {
    if (!seen.has(d.factory_name)) seen.set(d.factory_name, d)
  }
  return [...seen.values()]
}

// Flat query for recent logs (no nested select / no FK dependency)
async function getRecentLogs(limit = 5) {
  const { data, error } = await supabase
    .from('receive_logs')
    .select('id, action_type, qty, defect_qty, lost_qty, logged_at, part_id, stage_id')
    .order('logged_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  const logs = data || []

  // Enrich with part_name and stage_name via separate queries
  for (const log of logs) {
    if (log.part_id) {
      const { data: part } = await supabase
        .from('parts').select('name').eq('id', log.part_id).single()
      log.part_name = part?.name || null
    }
    if (log.stage_id) {
      const { data: stage } = await supabase
        .from('process_stages').select('factory_name, action_name').eq('id', log.stage_id).single()
      log.stage_name = stage ? `${stage.factory_name}・${stage.action_name}` : null
    }
  }
  return logs
}

// Inserts one row into bot_feedback. Reuses the module's shared client so the
// WebSocket polyfill / sanitized URL fixes apply here too. analysis/category/
// priority are optional — left null if no Claude analysis was attached.
async function submitFeedback({ telegram_user_id, telegram_name, message, analysis = null, category = null, priority = null }) {
  const { error } = await supabase.from('bot_feedback').insert({
    telegram_user_id,
    telegram_name,
    message,
    analysis,
    category,
    priority,
    created_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ── Write ────────────────────────────────────────────────────────────────────

// Inserts a receive_log and updates stock counters via read-then-write.
async function logInventory(params) {
  console.log('=== 開始寫入 ===')
  console.log('params:', JSON.stringify(params, null, 2))

  // 確認必要欄位
  if (!params.product_id) throw new Error('缺少 product_id')
  if (!params.part_id) throw new Error('缺少 part_id')
  if (!params.action_type) throw new Error('缺少 action_type')
  if (!params.qty || params.qty <= 0) throw new Error('數量不正確：' + params.qty)

  const {
    action_type: at, product_id, part_id, stage_id,
    sku_color, qty, defect_qty: dq = 0, lost_qty: lq = 0, note,
  } = params
  const net = qty - dq

  const insertData = {
    product_id,
    part_id,
    stage_id:    stage_id || null,
    sku_color:   sku_color || null,
    action_type: at,
    qty:         parseInt(qty),
    defect_qty:  parseInt(dq) || 0,
    lost_qty:    parseInt(lq) || 0,
    note:        note || null,
    logged_at:   new Date().toISOString(),
  }
  console.log('INSERT 資料：', JSON.stringify(insertData, null, 2))

  // 1. Insert into receive_logs
  const { data: log, error: logErr } = await supabase
    .from('receive_logs')
    .insert(insertData)
    .select()
    .single()

  if (logErr) {
    console.error('=== INSERT 失敗 ===')
    console.error(JSON.stringify(logErr, null, 2))
    throw new Error(logErr.message)
  }

  console.log('=== 寫入成功 ===')
  console.log('寫入的資料：', JSON.stringify(log, null, 2))

  // 2. Update stock counters
  try {
    await updateStock(at, part_id, stage_id, { qty, dq, lq, net })
    console.log('庫存更新成功')
  } catch (stockErr) {
    // Log but don't fail — the receive_log is already written
    console.error('庫存更新失敗（紀錄已寫入）：', stockErr.message)
  }

  return log
}

async function updateStock(at, partId, stageId, { qty, dq, lq, net }) {
  async function incParts(delta) {
    const { data: cur, error } = await supabase
      .from('parts')
      .select('warehouse_stock, defect_stock, total_defect, total_lost, total_scrapped')
      .eq('id', partId).single()
    if (error) throw error
    const { error: upErr } = await supabase.from('parts').update({
      warehouse_stock: Math.max(0, (cur.warehouse_stock || 0) + (delta.warehouse_stock || 0)),
      defect_stock:    Math.max(0, (cur.defect_stock    || 0) + (delta.defect_stock    || 0)),
      total_defect:    (cur.total_defect   || 0) + (delta.total_defect   || 0),
      total_lost:      (cur.total_lost     || 0) + (delta.total_lost     || 0),
      total_scrapped:  (cur.total_scrapped || 0) + (delta.total_scrapped || 0),
    }).eq('id', partId)
    if (upErr) throw upErr
  }

  async function incStage(delta) {
    if (!stageId) return
    const { data: cur, error } = await supabase
      .from('process_stages')
      .select('in_transit, total_sent, total_returned, total_defect')
      .eq('id', stageId).single()
    if (error) throw error
    const { error: upErr } = await supabase.from('process_stages').update({
      in_transit:     Math.max(0, (cur.in_transit     || 0) + (delta.in_transit     || 0)),
      total_sent:     (cur.total_sent     || 0) + (delta.total_sent     || 0),
      total_returned: (cur.total_returned || 0) + (delta.total_returned || 0),
      total_defect:   (cur.total_defect   || 0) + (delta.total_defect   || 0),
    }).eq('id', stageId)
    if (upErr) throw upErr
  }

  if (at === 'receive') {
    await incParts({ warehouse_stock: net, defect_stock: dq, total_defect: dq })
  } else if (at === 'send') {
    await incParts({ warehouse_stock: -qty, total_lost: lq })
    await incStage({ in_transit: qty - lq, total_sent: qty })
  } else if (at === 'ship') {
    await incParts({ warehouse_stock: -qty })
  } else if (at === 'return') {
    await incStage({ in_transit: -(qty + lq), total_returned: qty, total_defect: dq })
    await incParts({ warehouse_stock: net, defect_stock: dq, total_defect: dq, total_lost: lq })
  } else if (at === 'rework') {
    await incParts({ defect_stock: -qty })
    await incStage({ in_transit: qty, total_sent: qty })
  } else if (at === 'scrap') {
    await incParts({ defect_stock: -qty, total_scrapped: qty })
  }
}

module.exports = { getProducts, getPartsWithStages, getStagesForPart, getAllFactories, logInventory, getRecentLogs, submitFeedback }
