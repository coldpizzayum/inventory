import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/csv/:product_id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const product = await db.prepare('SELECT * FROM products WHERE id=?').get(req.params.product_id)
    if (!product) return res.status(404).json({ error: '找不到產品' })

    const logs = await db.prepare(`
      SELECT r.*, pt.name as part_name
      FROM receive_logs r
      LEFT JOIN parts pt ON pt.id = r.part_id
      WHERE r.product_id=?
      ORDER BY r.logged_at DESC
    `).all(req.params.product_id)

    const ACTION = { receive: '進貨', send: '送出加工', return: '回廠', ship: '大貨出貨' }
    const rows = [
      ['時間', '零件', 'SKU顏色', '動作', '數量', '不良品', '備註'],
      ...logs.map(l => [
        l.logged_at, l.part_name || '', l.sku_color || '',
        ACTION[l.action_type] || l.action_type,
        l.qty, l.defect_qty, l.note || '',
      ]),
    ]

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom = '﻿'
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(product.name)}_logs.csv"`)
    res.send(bom + csv)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
