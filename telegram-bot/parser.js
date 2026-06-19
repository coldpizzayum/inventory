'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const { getProducts, getPartsWithStages, getAllFactories } = require('./supabase')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ACTION_LABEL = {
  receive: '進貨（原料）',
  return:  '回廠',
  send:    '出貨（送加工）',
  ship:    '大貨出貨',
  rework:  '重工',
  scrap:   '報廢',
}

// Calls Claude Haiku to parse a free-form Chinese inventory message into structured JSON.
async function parseInventoryInput(userText) {
  const [products, factories] = await Promise.all([getProducts(), getAllFactories()])

  const productList  = products.map(p => `- ${p.name}（id: ${p.id}）`).join('\n')
  const factoryNames = [...new Set(factories.map(f => f.factory_name))].join('、')

  const system = `你是益成金屬工廠的庫存管理助手。工人用中文輸入進出貨資訊，你解析成 JSON。

現有產品：
${productList}

現有加工廠：${factoryNames}

動作類型定義：
- receive：進貨（新原料入倉）
- return：回廠（零件從加工廠回來）
- send：送出（零件送去加工廠）
- ship：大貨出貨（成品出給客戶）
- rework：重工
- scrap：報廢

只回傳 JSON，不加其他文字。格式：
{
  "action_type": "receive|return|send|ship|rework|scrap",
  "product_name": "產品名稱（模糊比對即可）",
  "part_name": "零件名稱",
  "sku_color": "顏色/SKU（沒有則 null）",
  "factory_name": "加工廠名稱（進貨原料或大貨出貨則 null）",
  "qty": 數量（整數）,
  "defect_qty": 不良品數量（沒有則 0）,
  "lost_qty": 運送途中遺失數量（沒有則 0）,
  "note": "備註（沒有則 null）",
  "confidence": "high|medium|low",
  "unclear": "不確定的地方（沒有則 null）"
}

無法解析時回傳：{ "error": "原因" }`

  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: userText }],
  })

  const text = resp.content[0].text.trim()
  try {
    return JSON.parse(text)
  } catch {
    return { error: '解析失敗，請重試' }
  }
}

// Turns Claude's parsed names into real IDs by looking up the Supabase tables.
async function resolveIds(parsed) {
  const products = await getProducts()

  // Fuzzy match product
  let product = products.find(p =>
    p.name.includes(parsed.product_name) ||
    (parsed.product_name && parsed.product_name.includes(p.name))
  )
  // Single-product shortcut
  if (!product && products.length === 1) product = products[0]
  if (!product) return { error: `找不到產品「${parsed.product_name}」` }

  const parts = await getPartsWithStages(product.id)

  // Fuzzy match part
  const part = parts.find(p =>
    p.name.includes(parsed.part_name) ||
    (parsed.part_name && parsed.part_name.includes(p.name))
  )
  if (!part) return { error: `找不到零件「${parsed.part_name}」` }

  // Fuzzy match SKU
  const sku = parsed.sku_color && part.skus?.length
    ? part.skus.find(s =>
        s.color_name.includes(parsed.sku_color) ||
        parsed.sku_color.includes(s.color_name)
      )
    : null

  // Resolve stage
  const stages = part.stages || []
  let stage = null
  if (parsed.factory_name) {
    const byFactory = stages.filter(s =>
      s.factory_name.includes(parsed.factory_name) ||
      parsed.factory_name.includes(s.factory_name)
    )
    if (parsed.action_type === 'return') {
      // Prefer stage with in_transit > 0; fallback to highest total_sent (handles stale data)
      stage =
        byFactory.find(s => (s.in_transit || 0) > 0) ||
        [...byFactory].sort((a, b) => (b.total_sent || 0) - (a.total_sent || 0))[0] ||
        null
    } else {
      stage = [...byFactory].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0] || null
    }
  }

  return {
    product_id:   product.id,
    product_name: product.name,
    part_id:      part.id,
    part_name:    part.name,
    sku_color:    sku?.color_name  || parsed.sku_color  || null,
    stage_id:     stage?.id        || null,
    stage_name:   stage ? `${stage.factory_name}・${stage.action_name}` : null,
    action_type:  parsed.action_type,
    qty:          parsed.qty,
    defect_qty:   parsed.defect_qty || 0,
    lost_qty:     parsed.lost_qty   || 0,
    note:         parsed.note       || null,
    confidence:   parsed.confidence || 'high',
    unclear:      parsed.unclear    || null,
  }
}

module.exports = { parseInventoryInput, resolveIds, ACTION_LABEL }
