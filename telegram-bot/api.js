// Calls the existing Inventory Express API.
// Set INVENTORY_API_URL to the deployed Railway service URL (e.g. https://inventory.railway.app).
'use strict'

const BASE = (process.env.INVENTORY_API_URL || 'http://localhost:3001').replace(/\/$/, '')

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status} ${path}`)
  }
  return res.json()
}

// Returns [{ id, name }]
async function getProducts() {
  return apiFetch('/api/products')
}

// Returns parts with nested stages and skus
// [{ id, name, skus: [{id,color_name}], stages: [{id,factory_name,action_name,in_transit,total_sent,sort_order}] }]
async function getPartsWithStages(productId) {
  return apiFetch(`/api/products/${encodeURIComponent(productId)}/parts`)
}

// Collects unique factory names across all products/parts
async function getAllFactories() {
  const products = await getProducts()
  const allParts = await Promise.all(products.map(p => getPartsWithStages(p.id)))
  const seen = new Map()
  for (const parts of allParts) {
    for (const part of parts) {
      for (const s of (part.stages || [])) {
        if (!seen.has(s.factory_name)) seen.set(s.factory_name, s)
      }
    }
  }
  return [...seen.values()]
}

// Submits a receive log via the existing API
async function logInventory(params) {
  return apiFetch('/api/receive-logs', {
    method: 'POST',
    body: JSON.stringify({
      product_id:  params.product_id,
      part_id:     params.part_id,
      stage_id:    params.stage_id   || null,
      sku_color:   params.sku_color  || '',
      action_type: params.action_type,
      qty:         params.qty,
      defect_qty:  params.defect_qty || 0,
      lost_qty:    params.lost_qty   || 0,
      note:        params.note       || '',
    }),
  })
}

// Fetches recent logs (with joined names)
async function getRecentLogs(limit = 5) {
  return apiFetch(`/api/receive-logs?limit=${limit}`)
}

module.exports = { getProducts, getPartsWithStages, getAllFactories, logInventory, getRecentLogs }
