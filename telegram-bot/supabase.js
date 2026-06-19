'use strict'

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Reads ────────────────────────────────────────────────────────────────────

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .order('name')
  if (error) throw error
  return data || []
}

// Returns parts with nested skus and stages (normalized field names)
async function getPartsWithStages(productId) {
  const { data, error } = await supabase
    .from('parts')
    .select(`
      id, name, sort_order, warehouse_stock, defect_stock, total_defect, total_lost,
      part_skus ( id, color_name ),
      process_stages ( id, factory_name, action_name, in_transit, total_sent, total_returned, sort_order )
    `)
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  return (data || []).map(p => ({
    ...p,
    skus:   p.part_skus       || [],
    stages: p.process_stages  || [],
  }))
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

async function getRecentLogs(limit = 5) {
  const { data, error } = await supabase
    .from('receive_logs')
    .select(`
      id, action_type, qty, defect_qty, lost_qty, logged_at,
      parts ( name ),
      process_stages ( factory_name, action_name )
    `)
    .order('logged_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map(l => ({
    ...l,
    part_name:  l.parts?.name,
    stage_name: l.process_stages
      ? `${l.process_stages.factory_name}・${l.process_stages.action_name}`
      : null,
  }))
}

// ── Write ────────────────────────────────────────────────────────────────────

// Replicates the Express receiveLogs.js transaction logic.
// Not atomic (Supabase JS client), but safe for single-worker bot usage.
async function logInventory(params) {
  const {
    action_type: at, product_id, part_id, stage_id,
    sku_color, qty, defect_qty: dq = 0, lost_qty: lq = 0, note,
  } = params
  const net = qty - dq

  // 1. Insert receive_log
  const { data: log, error: logErr } = await supabase
    .from('receive_logs')
    .insert({
      product_id,
      part_id,
      stage_id:    stage_id || null,
      sku_color:   sku_color || '',
      action_type: at,
      qty,
      defect_qty:  dq,
      lost_qty:    lq,
      note:        note || '',
      logged_at:   new Date().toISOString(),
    })
    .select('id')
    .single()
  if (logErr) throw logErr
  const logId = log.id

  // Helper: read-then-write increment on parts
  async function incParts(delta) {
    const { data: cur, error } = await supabase
      .from('parts')
      .select('warehouse_stock, defect_stock, total_defect, total_lost, total_scrapped')
      .eq('id', part_id)
      .single()
    if (error) throw error
    const { error: upErr } = await supabase
      .from('parts')
      .update({
        warehouse_stock: Math.max(0, (cur.warehouse_stock || 0) + (delta.warehouse_stock || 0)),
        defect_stock:    Math.max(0, (cur.defect_stock    || 0) + (delta.defect_stock    || 0)),
        total_defect:    (cur.total_defect    || 0) + (delta.total_defect    || 0),
        total_lost:      (cur.total_lost      || 0) + (delta.total_lost      || 0),
        total_scrapped:  (cur.total_scrapped  || 0) + (delta.total_scrapped  || 0),
      })
      .eq('id', part_id)
    if (upErr) throw upErr
  }

  // Helper: read-then-write increment on process_stages
  async function incStage(delta) {
    if (!stage_id) return
    const { data: cur, error } = await supabase
      .from('process_stages')
      .select('in_transit, total_sent, total_returned, total_defect')
      .eq('id', stage_id)
      .single()
    if (error) throw error
    const { error: upErr } = await supabase
      .from('process_stages')
      .update({
        in_transit:     Math.max(0, (cur.in_transit     || 0) + (delta.in_transit     || 0)),
        total_sent:     (cur.total_sent     || 0) + (delta.total_sent     || 0),
        total_returned: (cur.total_returned || 0) + (delta.total_returned || 0),
        total_defect:   (cur.total_defect   || 0) + (delta.total_defect   || 0),
      })
      .eq('id', stage_id)
    if (upErr) throw upErr
  }

  // Helper: record defect log
  async function insertDefectLog(source) {
    if (dq <= 0) return
    await supabase.from('defect_logs').insert({
      product_id,
      part_id,
      stage_id: source === 'incoming' ? null : (stage_id || null),
      sku_color: sku_color || '',
      qty: dq,
      status: 'pending',
      source,
      receive_log_id: logId,
    })
  }

  // 2. Apply stock updates per action_type
  if (at === 'receive') {
    await incParts({ warehouse_stock: net, defect_stock: dq, total_defect: dq })
    await insertDefectLog('incoming')

  } else if (at === 'send') {
    await incParts({ warehouse_stock: -qty, total_lost: lq })
    await incStage({ in_transit: qty - lq, total_sent: qty })

  } else if (at === 'ship') {
    await incParts({ warehouse_stock: -qty })

  } else if (at === 'return') {
    await incStage({ in_transit: -(qty + lq), total_returned: qty, total_defect: dq })
    await incParts({ warehouse_stock: net, defect_stock: dq, total_defect: dq, total_lost: lq })
    await insertDefectLog('return')

  } else if (at === 'rework') {
    await incParts({ defect_stock: -qty })
    await incStage({ in_transit: qty, total_sent: qty })

  } else if (at === 'scrap') {
    await incParts({ defect_stock: -qty, total_scrapped: qty })
  }

  return logId
}

module.exports = { getProducts, getPartsWithStages, getAllFactories, logInventory, getRecentLogs }
