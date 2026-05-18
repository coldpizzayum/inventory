-- ============================================================
-- DiCAS 庫存管理系統 — Supabase Schema
-- 在 Supabase SQL Editor 執行此檔案以建立所有資料表
-- ============================================================

-- 1. products（最上層，無外鍵依賴）
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_qty INTEGER,
  order_date TEXT,
  estimated_completion TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. parts（依賴 products）
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  warehouse_stock INTEGER DEFAULT 0,
  defect_stock INTEGER DEFAULT 0,
  total_defect INTEGER DEFAULT 0,
  total_scrapped INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. part_skus（依賴 parts）
CREATE TABLE IF NOT EXISTS part_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id TEXT REFERENCES parts(id) ON DELETE CASCADE,
  color_name TEXT NOT NULL,
  color_hex TEXT
);

-- 4. process_stages（依賴 parts）
CREATE TABLE IF NOT EXISTS process_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id TEXT REFERENCES parts(id) ON DELETE CASCADE,
  factory_name TEXT NOT NULL,
  action_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  in_transit INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_returned INTEGER DEFAULT 0,
  total_defect INTEGER DEFAULT 0
);

-- 5. packing_items（依賴 products）
CREATE TABLE IF NOT EXISTS packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supplier TEXT,
  stock INTEGER DEFAULT 0,
  month_in INTEGER DEFAULT 0,
  month_out INTEGER DEFAULT 0,
  defect INTEGER DEFAULT 0
);

-- 6. workers（獨立，無外鍵依賴）
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. receive_logs（依賴 products、parts、process_stages、workers）
CREATE TABLE IF NOT EXISTS receive_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id),
  part_id TEXT REFERENCES parts(id),
  stage_id UUID REFERENCES process_stages(id),
  sku_color TEXT,
  action_type TEXT NOT NULL,
  qty INTEGER NOT NULL,
  defect_qty INTEGER DEFAULT 0,
  note TEXT,
  worker_id UUID REFERENCES workers(id),
  logged_at TIMESTAMP DEFAULT NOW()
);

-- 8. defect_logs（依賴 products、parts、process_stages、receive_logs、workers）
CREATE TABLE IF NOT EXISTS defect_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id),
  part_id TEXT REFERENCES parts(id),
  stage_id UUID REFERENCES process_stages(id),
  sku_color TEXT,
  qty INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  source TEXT NOT NULL,
  receive_log_id UUID REFERENCES receive_logs(id),
  worker_id UUID REFERENCES workers(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. stock_adjustments（依賴 products）
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id),
  previous_qty INTEGER NOT NULL,
  new_qty INTEGER NOT NULL,
  diff INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by TEXT DEFAULT 'admin',
  adjusted_at TIMESTAMP DEFAULT NOW()
);

-- 10. designer_tokens（依賴 products）
CREATE TABLE IF NOT EXISTS designer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  product_id TEXT REFERENCES products(id),
  label TEXT,
  last_accessed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. orders（依賴 products）
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES products(id),
  target_qty INTEGER NOT NULL,
  completed_qty INTEGER DEFAULT 0,
  due_date TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
