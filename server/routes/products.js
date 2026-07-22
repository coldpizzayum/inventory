import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const db = getDb()
    const products = await db.prepare(`
      SELECT p.*,
        COALESCE(p.warehouse_stock, 0) as warehouse_total,
        COALESCE((SELECT SUM(ps.in_transit) FROM process_stages ps JOIN parts pt ON ps.part_id = pt.id WHERE pt.product_id = p.id), 0) as in_transit_total,
        COALESCE((SELECT SUM(defect_stock) FROM parts WHERE product_id = p.id), 0) as defect_total,
        (SELECT MAX(logged_at) FROM receive_logs WHERE product_id = p.id) as last_receive_at,
        COALESCE((SELECT COUNT(*) FROM stock_adjustments WHERE product_id = p.id), 0) as adjustment_count
      FROM products p
      ORDER BY p.created_at DESC
    `).all()

    const variantRows = await db.prepare(
      `SELECT product_id, variant_name, quantity FROM product_variant_stock WHERE quantity > 0`
    ).all()
    const variantsByProduct = {}
    for (const row of variantRows) {
      (variantsByProduct[row.product_id] ??= []).push({ variant_name: row.variant_name, quantity: row.quantity })
    }
    for (const p of products) p.variant_stock = variantsByProduct[p.id] || []

    res.json(products)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, description, order_qty, order_date, estimated_completion } = req.body
    if (!name) return res.status(400).json({ error: '產品名稱必填' })
    const id = uuidv4()
    await db.prepare(
      'INSERT INTO products (id, name, description, order_qty, order_date, estimated_completion) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, description || '', order_qty || 0, order_date || '', estimated_completion || '')
    res.status(201).json({ id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name, description, order_qty, order_date, estimated_completion } = req.body
    await db.prepare(
      'UPDATE products SET name=?, description=?, order_qty=?, order_date=?, estimated_completion=? WHERE id=?'
    ).run(name, description, order_qty, order_date, estimated_completion, req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const productId = req.params.id

    await db.transaction(async (tx) => {
      const parts = await tx.prepare('SELECT id FROM parts WHERE product_id=?').all(productId)
      const partIds = parts.map(p => p.id)
      const partPh = partIds.map(() => '?').join(',')

      const qcPending = await tx.prepare('SELECT id FROM qc_pending WHERE product_id=?').all(productId)
      const qcPendingIds = qcPending.map(q => q.id)
      if (qcPendingIds.length) {
        await tx.prepare(`DELETE FROM qc_logs WHERE qc_pending_id IN (${qcPendingIds.map(() => '?').join(',')})`).run(...qcPendingIds)
      }
      await tx.prepare('DELETE FROM qc_pending WHERE product_id=?').run(productId)

      if (partIds.length) {
        await tx.prepare(`DELETE FROM part_skus WHERE part_id IN (${partPh})`).run(...partIds)
        await tx.prepare(`DELETE FROM process_stages WHERE part_id IN (${partPh})`).run(...partIds)
      }

      // defect_logs / receive_logs 在正式站的 Postgres 上對 part_id 有外鍵約束
      // （本地 sqlite schema 沒宣告，但正式站已存在），必須在刪 parts 之前先清掉
      await tx.prepare('DELETE FROM defect_logs WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM receive_logs WHERE product_id=?').run(productId)

      await tx.prepare('DELETE FROM parts WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM packing_items WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM designer_tokens WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM brand_products WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM stock_adjustments WHERE product_id=?').run(productId)
      await tx.prepare('DELETE FROM orders WHERE product_id=?').run(productId)

      await tx.prepare('DELETE FROM products WHERE id=?').run(productId)
    })

    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/parts', async (req, res) => {
  try {
    const db = getDb()
    const parts = await db.prepare('SELECT * FROM parts WHERE product_id=? ORDER BY sort_order').all(req.params.id)
    const partIds = parts.map(p => p.id)

    const [skus, stages, qcPending, qcStocked] = partIds.length
      ? await Promise.all([
          db.prepare(`SELECT * FROM part_skus WHERE part_id IN (${partIds.map(() => '?').join(',')}) ORDER BY id`).all(...partIds),
          db.prepare(`SELECT * FROM process_stages WHERE part_id IN (${partIds.map(() => '?').join(',')}) ORDER BY sort_order`).all(...partIds),
          db.prepare(`SELECT part_id, SUM(qty) as qty FROM qc_pending WHERE part_id IN (${partIds.map(() => '?').join(',')}) AND qty > 0 GROUP BY part_id`).all(...partIds),
          db.prepare(`SELECT part_id, SUM(qty) as qty FROM qc_logs WHERE part_id IN (${partIds.map(() => '?').join(',')}) AND action='stock' GROUP BY part_id`).all(...partIds),
        ])
      : [[], [], [], []]

    const result = parts.map(part => ({
      ...part,
      skus:   skus.filter(s => s.part_id === part.id),
      stages: stages.filter(s => s.part_id === part.id),
      qc_pending_qty:    Number(qcPending.find(q => q.part_id === part.id)?.qty || 0),
      qc_stocked_total:  Number(qcStocked.find(q => q.part_id === part.id)?.qty || 0),
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/variants', async (req, res) => {
  try {
    const db = getDb()
    const rows = await db.prepare('SELECT DISTINCT variant_name FROM product_boms WHERE product_id=?').all(req.params.id)
    res.json(rows.map(r => r.variant_name))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/produce', async (req, res) => {
  try {
    const db = getDb()
    const { variant_name, quantity, note } = req.body
    if (!variant_name) return res.status(400).json({ error: '缺少款式' })
    if (!quantity || quantity <= 0) return res.status(400).json({ error: '數量必須是正整數' })
    const row = await db.prepare('SELECT * FROM fn_produce_product(?, ?, ?, ?)').get(req.params.id, variant_name, quantity, note || '')
    res.json(row || { ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
