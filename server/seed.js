import { initDb } from './db.js'
import { v4 as uuidv4 } from 'uuid'

const FACTORIES = [
  '黑豬鋁', '家佑', '阿奇', '廠內', '雷射', '小林',
  '良浩', '阿勗', '拋台李', '至威', '永勝', '豪成', '勗成',
]

const PRODUCTS = [
  {
    id: uuidv4(), name: 'Pen N', description: '筆蓋系列',
    order_qty: 3000, order_date: '2025-02-20',
    parts: [
      { name: 'L夾',    skus: ['鈦', '銀', '橘', '藍'] },
      { name: '筆蓋頂塞', skus: ['鈦', '銀', '黑'] },
      { name: '筆蓋',   skus: ['鈦', '銀'] },
      { name: '木料筆身', skus: ['胡桃木', '楓木', '雞翅木'] },
      { name: '金屬筆管', skus: ['鈦', '銀', '硬膜黑'] },
      { name: '鋁筆首',  skus: ['鈦', '銀'] },
    ],
    packings: [],
  },
  {
    id: uuidv4(), name: '名片盒', description: '鋁合金名片盒',
    order_qty: 2000, order_date: '2025-05-23',
    parts: [
      { name: '底盒',    skus: ['硬膜鈦', '硬膜銀', '硬膜灰'] },
      { name: '2孔三角板', skus: ['硬膜鈦', '硬膜銀', '硬膜灰'] },
      { name: '單孔三角板', skus: ['硬膜鈦', '硬膜銀', '硬膜灰'] },
    ],
    packings: [],
  },
  {
    id: uuidv4(), name: '踩踩獸', description: '花生組',
    order_qty: 5000, order_date: '2025-02-20',
    parts: [
      { name: '花生主體#6061', skus: ['硬膜橘', '硬膜鐵灰', '硬膜銀'] },
      { name: '花生尖頭#304',  skus: ['硬膜橘', '硬膜鐵灰', '硬膜銀'] },
      { name: '花生平頭#6061', skus: ['硬膜橘', '硬膜鐵灰', '硬膜銀'] },
    ],
    packings: ['包裝紙罐', '車袋（布）', '矽膠墊', '矽膠圈2.2mm'],
  },
  {
    id: uuidv4(), name: '刮痧板', description: '#316/#304不鏽鋼',
    order_qty: 5000, order_date: '2025-02-20',
    parts: [
      { name: '舒弧#316不鏽鋼', skus: ['亮銀'] },
      { name: '兔兔#304不鏽鋼', skus: ['亮銀'] },
      { name: '附件#304',        skus: ['亮銀'] },
    ],
    packings: ['包裝材料', '車袋（布）', '矽膠墊', '矽膠圈2.2mm'],
  },
]

const DEFAULT_STAGES = [
  { factory: '廠內',  action: 'CNC加工' },
  { factory: '黑豬鋁', action: '陽極處理' },
  { factory: '家佑',  action: '拋光' },
]

async function seed() {
  const db = await initDb()

  // Clear in FK-safe order
  for (const t of ['designer_tokens', 'receive_logs', 'packing_items', 'process_stages', 'part_skus', 'parts', 'products']) {
    await db.exec(`DELETE FROM ${t}`)
  }

  for (const product of PRODUCTS) {
    await db.prepare(
      'INSERT INTO products (id, name, description, order_qty, order_date) VALUES (?, ?, ?, ?, ?)'
    ).run(product.id, product.name, product.description, product.order_qty, product.order_date)

    for (const [pi, part] of product.parts.entries()) {
      const partId = uuidv4()
      await db.prepare('INSERT INTO parts (id, product_id, name, sort_order) VALUES (?, ?, ?, ?)').run(partId, product.id, part.name, pi)

      for (const color of part.skus) {
        await db.prepare('INSERT INTO part_skus (part_id, color_name) VALUES (?, ?)').run(partId, color)
      }

      for (const [si, s] of DEFAULT_STAGES.entries()) {
        await db.prepare('INSERT INTO process_stages (part_id, factory_name, action_name, sort_order) VALUES (?, ?, ?, ?)').run(partId, s.factory, s.action, si)
      }
    }

    for (const name of product.packings) {
      await db.prepare('INSERT INTO packing_items (product_id, name, supplier, stock) VALUES (?, ?, ?, ?)').run(product.id, name, '', 0)
    }
  }

  const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'
  console.log(`✅ 種子資料建立完成 [${dbType}]`)
  console.log(`   產品：${PRODUCTS.length} 筆`)
  console.log(`   加工廠清單：${FACTORIES.join('、')}`)
  process.exit(0)
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1) })
