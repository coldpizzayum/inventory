import { Router } from 'express'
import { getDb } from '../db.js'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// List all brands with their assigned products
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const brands = await db.prepare('SELECT * FROM brands ORDER BY created_at DESC').all()
    const result = await Promise.all(brands.map(async (brand) => {
      const products = await db.prepare(`
        SELECT p.id, p.name FROM brand_products bp
        JOIN products p ON p.id = bp.product_id
        WHERE bp.brand_id = ?
        ORDER BY p.name
      `).all(brand.id)
      return { ...brand, products }
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create a brand
router.post('/', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { name } = req.body
    if (!name) return res.status(400).json({ error: '請填寫品牌名稱' })
    const token = uuidv4().replace(/-/g, '')
    const r = await db.prepare('INSERT INTO brands (name, token) VALUES (?, ?)').run(name, token)
    res.status(201).json({ id: r.lastInsertRowid, name, token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete a brand
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM brands WHERE id=?').run(req.params.id)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Assign a product to a brand
router.post('/:id/products', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    const { product_id } = req.body
    if (!product_id) return res.status(400).json({ error: '缺少產品ID' })
    await db.prepare('INSERT INTO brand_products (brand_id, product_id) VALUES (?, ?)').run(req.params.id, product_id)
    res.status(201).json({ ok: true })
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: '此產品已指派' })
    res.status(500).json({ error: e.message })
  }
})

// Remove a product from a brand
router.delete('/:id/products/:productId', requireAuth, async (req, res) => {
  try {
    const db = getDb()
    await db.prepare('DELETE FROM brand_products WHERE brand_id=? AND product_id=?').run(req.params.id, req.params.productId)
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
