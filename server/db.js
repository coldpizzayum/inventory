import Database from 'better-sqlite3'
import pg from 'pg'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Unified async interface ───────────────────────────────────────────────
// db.prepare(sql) → { all(...params), get(...params), run(...params) }
// db.exec(sql)    → void
// db.transaction(async fn(txDb)) → result
// ──────────────────────────────────────────────────────────────────────────

let _db = null

export function getDb() {
  if (!_db) throw new Error('DB not initialised – call initDb() first')
  return _db
}

export async function initDb() {
  if (_db) return _db
  _db = process.env.DATABASE_URL ? await createPgAdapter() : createSqliteAdapter()
  return _db
}

// ─── SQL schemas ──────────────────────────────────────────────────────────

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    order_qty INTEGER DEFAULT 0,
    order_date TEXT,
    estimated_completion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    warehouse_stock INTEGER DEFAULT 0,
    defect_stock INTEGER DEFAULT 0,
    total_defect INTEGER DEFAULT 0,
    total_scrapped INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS part_skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id TEXT NOT NULL,
    color_name TEXT NOT NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );
  CREATE TABLE IF NOT EXISTS process_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id TEXT NOT NULL,
    factory_name TEXT NOT NULL,
    action_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    in_transit INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_returned INTEGER DEFAULT 0,
    total_defect INTEGER DEFAULT 0,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );
  CREATE TABLE IF NOT EXISTS defect_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT,
    part_id TEXT,
    stage_id INTEGER,
    sku_color TEXT,
    qty INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    source TEXT NOT NULL,
    receive_log_id INTEGER,
    worker_id INTEGER,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS packing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    supplier TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    month_in INTEGER DEFAULT 0,
    month_out INTEGER DEFAULT 0,
    defect INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS receive_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT,
    part_id TEXT,
    stage_id INTEGER,
    sku_color TEXT,
    action_type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    defect_qty INTEGER DEFAULT 0,
    note TEXT,
    operator TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS designer_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS brand_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(brand_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    previous_qty INTEGER NOT NULL,
    new_qty INTEGER NOT NULL,
    diff INTEGER NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by TEXT DEFAULT 'admin',
    adjusted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS factories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    contact_name TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    note TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    order_qty INTEGER DEFAULT 0,
    order_date TEXT,
    estimated_completion TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    warehouse_stock INTEGER DEFAULT 0,
    defect_stock INTEGER DEFAULT 0,
    total_defect INTEGER DEFAULT 0,
    total_scrapped INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS part_skus (
    id SERIAL PRIMARY KEY,
    part_id TEXT NOT NULL,
    color_name TEXT NOT NULL,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );
  CREATE TABLE IF NOT EXISTS process_stages (
    id SERIAL PRIMARY KEY,
    part_id TEXT NOT NULL,
    factory_name TEXT NOT NULL,
    action_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    in_transit INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_returned INTEGER DEFAULT 0,
    total_defect INTEGER DEFAULT 0,
    FOREIGN KEY (part_id) REFERENCES parts(id)
  );
  CREATE TABLE IF NOT EXISTS defect_logs (
    id SERIAL PRIMARY KEY,
    product_id TEXT,
    part_id TEXT,
    stage_id INTEGER,
    sku_color TEXT,
    qty INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    source TEXT NOT NULL,
    receive_log_id INTEGER,
    worker_id INTEGER,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS packing_items (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    supplier TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    month_in INTEGER DEFAULT 0,
    month_out INTEGER DEFAULT 0,
    defect INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS receive_logs (
    id SERIAL PRIMARY KEY,
    product_id TEXT,
    part_id TEXT,
    stage_id INTEGER,
    sku_color TEXT,
    action_type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    defect_qty INTEGER DEFAULT 0,
    note TEXT,
    operator TEXT,
    logged_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS designer_tokens (
    id SERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS brand_products (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(brand_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    previous_qty INTEGER NOT NULL,
    new_qty INTEGER NOT NULL,
    diff INTEGER NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by TEXT DEFAULT 'admin',
    adjusted_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS factories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    contact_name TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    note TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`

// ─── 廠商目錄 backfill ──────────────────────────────────────────────────────
// process_stages 只存 factory_name 字串，沒有獨立的廠商表。新增「加工廠商」
// 管理頁面時，把既有紀錄裡出現過的廠商名稱（連同它們做過的加工類型，當作
// specialty 的初始值）灌一份進 factories，讓頁面一開始就有資料，不是空的。
// 只在某個廠商名稱還沒有對應的 factories row 時才補，重複執行不會重複新增。
function seedFactoriesFromStages(raw) {
  const existing = new Set(raw.prepare('SELECT name FROM factories').all().map(r => r.name))
  const rows = raw.prepare('SELECT DISTINCT factory_name, action_name FROM process_stages').all()
  const specialties = new Map()
  for (const r of rows) {
    if (!r.factory_name) continue
    if (!specialties.has(r.factory_name)) specialties.set(r.factory_name, new Set())
    if (r.action_name) specialties.get(r.factory_name).add(r.action_name)
  }
  const insert = raw.prepare('INSERT INTO factories (name, specialty, status) VALUES (?, ?, ?)')
  for (const [name, actions] of specialties) {
    if (existing.has(name)) continue
    insert.run(name, [...actions].join('・'), 'active')
  }
}

async function seedFactoriesFromStagesPg(pool) {
  const { rows: existingRows } = await pool.query('SELECT name FROM factories')
  const existing = new Set(existingRows.map(r => r.name))
  const { rows } = await pool.query('SELECT DISTINCT factory_name, action_name FROM process_stages')
  const specialties = new Map()
  for (const r of rows) {
    if (!r.factory_name) continue
    if (!specialties.has(r.factory_name)) specialties.set(r.factory_name, new Set())
    if (r.action_name) specialties.get(r.factory_name).add(r.action_name)
  }
  for (const [name, actions] of specialties) {
    if (existing.has(name)) continue
    await pool.query('INSERT INTO factories (name, specialty, status) VALUES ($1, $2, $3)', [name, [...actions].join('・'), 'active'])
  }
}

// ─── SQLite adapter ───────────────────────────────────────────────────────

function createSqliteAdapter() {
  const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/inventory.db')
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  const raw = new Database(dbPath)
  raw.pragma('journal_mode = WAL')
  raw.pragma('foreign_keys = ON')
  raw.exec(SQLITE_SCHEMA)

  // Migrations — add columns that may not exist in older DBs
  try { raw.exec('ALTER TABLE receive_logs ADD COLUMN operator TEXT') } catch (_) {}
  try { raw.exec('ALTER TABLE receive_logs ADD COLUMN stage_id INTEGER') } catch (_) {}
  try { raw.exec('ALTER TABLE receive_logs ADD COLUMN worker_id INTEGER') } catch (_) {}
  try { raw.exec('ALTER TABLE parts ADD COLUMN warehouse_stock INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE parts ADD COLUMN defect_stock INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE parts ADD COLUMN total_defect INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE parts ADD COLUMN total_scrapped INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE process_stages ADD COLUMN in_transit INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE defect_logs ADD COLUMN receive_log_id INTEGER') } catch (_) {}
  try { raw.exec('ALTER TABLE defect_logs ADD COLUMN worker_id INTEGER') } catch (_) {}
  try { raw.exec('ALTER TABLE defect_logs ADD COLUMN note TEXT') } catch (_) {}
  try { raw.exec('ALTER TABLE products ADD COLUMN image_url TEXT') } catch (_) {}
  try { raw.exec('ALTER TABLE part_skus ADD COLUMN color_hex TEXT') } catch (_) {}
  try { raw.exec('ALTER TABLE products ADD COLUMN warehouse_stock INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE receive_logs ADD COLUMN lost_qty INTEGER DEFAULT 0') } catch (_) {}
  try { raw.exec('ALTER TABLE parts ADD COLUMN total_lost INTEGER DEFAULT 0') } catch (_) {}
  // Migrate existing data: sum parts.warehouse_stock into products.warehouse_stock
  try { raw.exec(`UPDATE products SET warehouse_stock = COALESCE((SELECT SUM(warehouse_stock) FROM parts WHERE product_id = products.id), 0) WHERE warehouse_stock = 0`) } catch (_) {}
  raw.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      target_qty INTEGER NOT NULL,
      completed_qty INTEGER DEFAULT 0,
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)
  raw.exec(`
    CREATE TABLE IF NOT EXISTS defect_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT, part_id TEXT, stage_id INTEGER, sku_color TEXT,
      qty INTEGER NOT NULL, status TEXT DEFAULT 'pending', source TEXT NOT NULL,
      receive_log_id INTEGER, worker_id INTEGER, note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Seed default workers if table is empty
  const workerCount = raw.prepare('SELECT COUNT(*) as n FROM workers').get()
  if (workerCount.n === 0) {
    raw.exec("INSERT INTO workers (name) VALUES ('阿明'), ('小芳'), ('阿勗'), ('小林')")
  }

  // One-time backfill: turn existing process_stages 廠商名稱 into factories rows
  // so the 加工廠商 management page starts pre-populated, not empty
  seedFactoriesFromStages(raw)

  function makeStmt(sql) {
    const stmt = raw.prepare(sql)
    return {
      all:  (...args) => Promise.resolve(stmt.all(args.flat())),
      get:  (...args) => Promise.resolve(stmt.get(args.flat()) ?? null),
      run:  (...args) => {
        const r = stmt.run(args.flat())
        return Promise.resolve({ lastInsertRowid: r.lastInsertRowid, changes: r.changes })
      },
    }
  }

  return {
    prepare: makeStmt,
    exec: (sql) => { raw.exec(sql); return Promise.resolve() },
    transaction: async (fn) => {
      // Manual BEGIN/COMMIT so we can await the async fn
      raw.exec('BEGIN')
      try {
        const result = await fn({ prepare: makeStmt })
        raw.exec('COMMIT')
        return result
      } catch (e) {
        raw.exec('ROLLBACK')
        throw e
      }
    },
  }
}

// ─── PostgreSQL adapter ───────────────────────────────────────────────────

async function createPgAdapter() {
  const useSSL = !process.env.DATABASE_URL.includes('localhost')
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  })

  // Split schema by ; and run each statement
  const stmts = PG_SCHEMA.split(';').map(s => s.trim()).filter(Boolean)
  for (const s of stmts) await pool.query(s)

  // Migrations — add columns that may not exist in older DBs
  await pool.query('ALTER TABLE receive_logs ADD COLUMN IF NOT EXISTS operator TEXT')
  await pool.query('ALTER TABLE receive_logs ADD COLUMN IF NOT EXISTS stage_id INTEGER')
  await pool.query('ALTER TABLE receive_logs ADD COLUMN IF NOT EXISTS worker_id INTEGER')
  await pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS warehouse_stock INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS defect_stock INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS total_defect INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS total_scrapped INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE process_stages ADD COLUMN IF NOT EXISTS in_transit INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE defect_logs ADD COLUMN IF NOT EXISTS receive_log_id INTEGER')
  await pool.query('ALTER TABLE defect_logs ADD COLUMN IF NOT EXISTS worker_id INTEGER')
  await pool.query('ALTER TABLE defect_logs ADD COLUMN IF NOT EXISTS note TEXT')
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT')
  await pool.query('ALTER TABLE part_skus ADD COLUMN IF NOT EXISTS color_hex TEXT')
  await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_stock INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE receive_logs ADD COLUMN IF NOT EXISTS lost_qty INTEGER DEFAULT 0')
  await pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS total_lost INTEGER DEFAULT 0')
  // Migrate existing data: sum parts.warehouse_stock into products.warehouse_stock
  await pool.query(`UPDATE products SET warehouse_stock = COALESCE((SELECT SUM(warehouse_stock) FROM parts WHERE product_id = products.id), 0) WHERE warehouse_stock = 0`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      product_id TEXT NOT NULL,
      target_qty INTEGER NOT NULL,
      completed_qty INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS defect_logs (
      id SERIAL PRIMARY KEY,
      product_id TEXT, part_id TEXT, stage_id INTEGER, sku_color TEXT,
      qty INTEGER NOT NULL, status TEXT DEFAULT 'pending', source TEXT NOT NULL,
      receive_log_id INTEGER, worker_id INTEGER, note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Seed default workers if table is empty
  const { rows: wc } = await pool.query('SELECT COUNT(*) as n FROM workers')
  if (parseInt(wc[0].n) === 0) {
    await pool.query("INSERT INTO workers (name) VALUES ('阿明'), ('小芳'), ('阿勗'), ('小林')")
  }

  // One-time backfill: turn existing process_stages 廠商名稱 into factories rows
  await seedFactoriesFromStagesPg(pool)

  // Convert ? placeholders → $1, $2, ...
  function toPg(sql) {
    let i = 0
    return sql.replace(/\?/g, () => `$${++i}`)
  }

  // For INSERT, append RETURNING id so we can return lastInsertRowid
  function makePgStmt(sql, client) {
    const q = client ? (s, p) => client.query(s, p) : (s, p) => pool.query(s, p)
    const isInsert = /^\s*INSERT\s/i.test(sql.trimStart())
    const pgSql = toPg(isInsert ? `${sql} RETURNING id` : sql)

    return {
      all:  async (...args) => (await q(pgSql, args.flat())).rows,
      get:  async (...args) => (await q(pgSql, args.flat())).rows[0] ?? null,
      run:  async (...args) => {
        const r = await q(pgSql, args.flat())
        return { lastInsertRowid: r.rows[0]?.id ?? null, changes: r.rowCount }
      },
    }
  }

  return {
    prepare: (sql) => makePgStmt(sql, null),
    exec: async (sql) => {
      const stmts = sql.split(';').map(s => s.trim()).filter(Boolean)
      for (const s of stmts) await pool.query(s)
    },
    transaction: async (fn) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn({ prepare: (sql) => makePgStmt(sql, client) })
        await client.query('COMMIT')
        return result
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    },
  }
}

export default { getDb, initDb }
