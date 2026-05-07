import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/inventory.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
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
      total_sent INTEGER DEFAULT 0,
      total_returned INTEGER DEFAULT 0,
      total_defect INTEGER DEFAULT 0,
      FOREIGN KEY (part_id) REFERENCES parts(id)
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

    CREATE TABLE IF NOT EXISTS receive_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      part_id TEXT,
      sku_color TEXT,
      action_type TEXT NOT NULL,
      qty INTEGER NOT NULL,
      defect_qty INTEGER DEFAULT 0,
      note TEXT,
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
  `)
}

export default getDb
