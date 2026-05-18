// Reads local SQLite DB and generates Supabase-compatible seed SQL
// Run: node supabase/export_seed.mjs > supabase/seed_real_data.sql

import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.resolve(__dirname, '../data/inventory.db'))

function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const lines = []
lines.push('-- DiCAS seed data exported from local SQLite')
lines.push('-- Run AFTER schema.sql\n')

// ── products (TEXT PK, no conversion needed) ────────────────
const products = db.prepare('SELECT * FROM products').all()
if (products.length) {
  lines.push('-- products')
  for (const r of products) {
    lines.push(`INSERT INTO products (id, name, description, order_qty, order_date, estimated_completion, created_at) VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.description)}, ${esc(r.order_qty)}, ${esc(r.order_date)}, ${esc(r.estimated_completion)}, ${esc(r.created_at)}) ON CONFLICT (id) DO NOTHING;`)
  }
  lines.push('')
}

// ── parts (TEXT PK) ─────────────────────────────────────────
const parts = db.prepare('SELECT * FROM parts').all()
if (parts.length) {
  lines.push('-- parts')
  for (const r of parts) {
    lines.push(`INSERT INTO parts (id, product_id, name, sort_order, warehouse_stock, defect_stock, total_defect, total_scrapped) VALUES (${esc(r.id)}, ${esc(r.product_id)}, ${esc(r.name)}, ${esc(r.sort_order)}, ${esc(r.warehouse_stock)}, ${esc(r.defect_stock)}, ${esc(r.total_defect)}, ${esc(r.total_scrapped)}) ON CONFLICT (id) DO NOTHING;`)
  }
  lines.push('')
}

// ── workers (INTEGER PK → UUID) ─────────────────────────────
const workers = db.prepare('SELECT * FROM workers').all()
const workerIdMap = {}
if (workers.length) {
  lines.push('-- workers')
  for (const r of workers) {
    const uuid = randomUUID()
    workerIdMap[r.id] = uuid
    lines.push(`INSERT INTO workers (id, name, is_active, created_at) VALUES ('${uuid}', ${esc(r.name)}, ${r.is_active ? 'true' : 'false'}, ${esc(r.created_at)});`)
  }
  lines.push('')
}

// ── part_skus (INTEGER PK → UUID) ───────────────────────────
const partSkus = db.prepare('SELECT * FROM part_skus').all()
if (partSkus.length) {
  lines.push('-- part_skus')
  for (const r of partSkus) {
    lines.push(`INSERT INTO part_skus (id, part_id, color_name) VALUES ('${randomUUID()}', ${esc(r.part_id)}, ${esc(r.color_name)});`)
  }
  lines.push('')
}

// ── process_stages (INTEGER PK → UUID) ──────────────────────
const stages = db.prepare('SELECT * FROM process_stages').all()
const stageIdMap = {}
if (stages.length) {
  lines.push('-- process_stages')
  for (const r of stages) {
    const uuid = randomUUID()
    stageIdMap[r.id] = uuid
    lines.push(`INSERT INTO process_stages (id, part_id, factory_name, action_name, sort_order, in_transit, total_sent, total_returned, total_defect) VALUES ('${uuid}', ${esc(r.part_id)}, ${esc(r.factory_name)}, ${esc(r.action_name)}, ${esc(r.sort_order)}, ${esc(r.in_transit)}, ${esc(r.total_sent)}, ${esc(r.total_returned)}, ${esc(r.total_defect)});`)
  }
  lines.push('')
}

// ── packing_items (INTEGER PK → UUID) ───────────────────────
const packingItems = db.prepare('SELECT * FROM packing_items').all()
if (packingItems.length) {
  lines.push('-- packing_items')
  for (const r of packingItems) {
    lines.push(`INSERT INTO packing_items (id, product_id, name, supplier, stock, month_in, month_out, defect) VALUES ('${randomUUID()}', ${esc(r.product_id)}, ${esc(r.name)}, ${esc(r.supplier)}, ${esc(r.stock)}, ${esc(r.month_in)}, ${esc(r.month_out)}, ${esc(r.defect)});`)
  }
  lines.push('')
}

// ── receive_logs (INTEGER PK → UUID, stage_id & worker_id mapped) ──
const receiveLogs = db.prepare('SELECT * FROM receive_logs').all()
const receiveLogIdMap = {}
if (receiveLogs.length) {
  lines.push('-- receive_logs')
  for (const r of receiveLogs) {
    const uuid = randomUUID()
    receiveLogIdMap[r.id] = uuid
    const stageUUID = r.stage_id ? (stageIdMap[r.stage_id] ?? null) : null
    const workerUUID = r.worker_id ? (workerIdMap[r.worker_id] ?? null) : null
    lines.push(`INSERT INTO receive_logs (id, product_id, part_id, stage_id, sku_color, action_type, qty, defect_qty, note, worker_id, logged_at) VALUES ('${uuid}', ${esc(r.product_id)}, ${esc(r.part_id)}, ${stageUUID ? `'${stageUUID}'` : 'NULL'}, ${esc(r.sku_color)}, ${esc(r.action_type)}, ${esc(r.qty)}, ${esc(r.defect_qty)}, ${esc(r.note)}, ${workerUUID ? `'${workerUUID}'` : 'NULL'}, ${esc(r.logged_at)});`)
  }
  lines.push('')
}

// ── defect_logs ──────────────────────────────────────────────
const defectLogs = db.prepare('SELECT * FROM defect_logs').all()
if (defectLogs.length) {
  lines.push('-- defect_logs')
  for (const r of defectLogs) {
    const stageUUID = r.stage_id ? (stageIdMap[r.stage_id] ?? null) : null
    const workerUUID = r.worker_id ? (workerIdMap[r.worker_id] ?? null) : null
    const rlUUID = r.receive_log_id ? (receiveLogIdMap[r.receive_log_id] ?? null) : null
    lines.push(`INSERT INTO defect_logs (id, product_id, part_id, stage_id, sku_color, qty, status, source, receive_log_id, worker_id, note, created_at) VALUES ('${randomUUID()}', ${esc(r.product_id)}, ${esc(r.part_id)}, ${stageUUID ? `'${stageUUID}'` : 'NULL'}, ${esc(r.sku_color)}, ${esc(r.qty)}, ${esc(r.status)}, ${esc(r.source)}, ${rlUUID ? `'${rlUUID}'` : 'NULL'}, ${workerUUID ? `'${workerUUID}'` : 'NULL'}, ${esc(r.note)}, ${esc(r.created_at)});`)
  }
  lines.push('')
}

// ── designer_tokens (INTEGER PK → UUID) ─────────────────────
const tokens = db.prepare('SELECT * FROM designer_tokens').all()
if (tokens.length) {
  lines.push('-- designer_tokens')
  for (const r of tokens) {
    lines.push(`INSERT INTO designer_tokens (id, token, product_id, label, created_at) VALUES ('${randomUUID()}', ${esc(r.token)}, ${esc(r.product_id)}, ${esc(r.label)}, ${esc(r.created_at)});`)
  }
  lines.push('')
}

console.log(lines.join('\n'))
