'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const { getProducts, getPartsWithStages, getAllFactories } = require('./supabase')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Diagnostic: verify the Anthropic SDK can reach the API at all, independent of
// the Supabase calls inside parseInventoryInput. Runs once at bot startup.
async function testConnection() {
  try {
    await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    })
    console.log('✅ Claude API 連線成功')
  } catch (err) {
    console.error('❌ Claude API 連線失敗：', err.message)
    console.error('錯誤詳情：', JSON.stringify(err, Object.getOwnPropertyNames(err)))
  }
}

const ACTION_LABEL = {
  receive: '進貨（原料）',
  return:  '回廠',
  send:    '出貨（送加工）',
  ship:    '大貨出貨',
  rework:  '重工',
  scrap:   '報廢',
}

// Calls Claude to parse a free-form Chinese inventory message into structured JSON.
async function parseInventoryInput(userText) {
  // Step A: fetch context from Supabase — isolated so its errors aren't confused with the Claude call
  let products, factories
  try {
    ;[products, factories] = await Promise.all([getProducts(), getAllFactories()])
  } catch (err) {
    console.error('=== PARSER SUPABASE ERROR ===')
    console.error('輸入文字：', userText)
    console.error('錯誤訊息：', err.message)
    console.error('=============================')
    return { error: '讀取產品資料失敗：' + err.message }
  }

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

  // Step B: call Claude — isolated so SDK errors are clearly attributed
  let text
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: userText }],
    })
    text = resp.content[0].text.trim()
    console.log('Claude 回應：', text)
  } catch (err) {
    console.error('=== PARSER CLAUDE API ERROR ===')
    console.error('輸入文字：', userText)
    console.error('錯誤訊息：', err.message)
    console.error('錯誤詳情：', JSON.stringify(err, Object.getOwnPropertyNames(err)))
    console.error('===============================')
    return { error: 'Claude API 呼叫失敗：' + err.message }
  }

  // Step C: parse Claude's JSON response — try multiple strategies since the
  // model sometimes wraps JSON in markdown fences or adds stray text around it.
  let parsed = null

  // Strategy 1: direct parse
  try {
    parsed = JSON.parse(text)
  } catch {}

  // Strategy 2: strip ```json / ``` fences then parse
  if (!parsed) {
    try {
      const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {}
  }

  // Strategy 3: extract the first {...} block via regex
  if (!parsed) {
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    } catch {}
  }

  if (!parsed) {
    console.error('=== PARSER JSON ERROR ===')
    console.error('Claude 回傳：', text)
    console.error('========================')
    return { error: '解析失敗，請重試' }
  }

  console.log('解析結果：', parsed)
  return parsed
}

// Action types where a missing stage is worth asking about explicitly,
// rather than just flagging it as a generic warning on the confirm card.
const STAGE_REQUIRED = ['return', 'send', 'rework']

// Turns Claude's parsed names into real IDs by looking up the Supabase tables.
// Whatever can't be resolved (product / part / stage) is left null rather than
// raised as an error — the bot then asks the user to pick it interactively
// instead of rejecting the whole message.
async function resolveIds(parsed) {
  const base = {
    product_id:   null,
    product_name: null,
    part_id:      null,
    part_name:    parsed.part_name  || null,
    sku_color:    parsed.sku_color  || null,
    stage_id:     null,
    stage_name:   null,
    action_type:  parsed.action_type,
    qty:          parsed.qty,
    defect_qty:   parsed.defect_qty || 0,
    lost_qty:     parsed.lost_qty   || 0,
    note:         parsed.note       || null,
  }

  const products = await getProducts()

  // 如果沒有 product_name，從 part_name 反查產品（順便保留查到的 parts 避免重複查詢）
  let inferredParts = null
  if (!parsed.product_name && parsed.part_name) {
    for (const p of products) {
      const candidateParts = await getPartsWithStages(p.id)
      const found = candidateParts.find(pt =>
        pt.name.includes(parsed.part_name) ||
        parsed.part_name.includes(pt.name)
      )
      if (found) {
        parsed.product_name = p.name
        inferredParts = candidateParts
        console.log('從零件反查到產品：', p.name)
        break
      }
    }
  }

  // Fuzzy match product
  let product = parsed.product_name
    ? products.find(p => p.name.includes(parsed.product_name) || parsed.product_name.includes(p.name))
    : null
  // Single-product shortcut
  if (!product && products.length === 1) product = products[0]
  if (!product) return base // 沒有產品 → 讓 bot 列出所有產品讓使用者選

  const parts = inferredParts || await getPartsWithStages(product.id)

  // Fuzzy match part
  const part = parsed.part_name
    ? parts.find(p => p.name.includes(parsed.part_name) || parsed.part_name.includes(p.name))
    : null
  if (!part) return { ...base, product_id: product.id, product_name: product.name } // 有產品沒零件 → 讓 bot 列出該產品的零件

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
    // Factory names often carry a parenthesised nickname workers actually say,
    // e.g. "至威車銑(黑豬)" — match against that too, not just the full name.
    const nicknameOf = name => name.match(/\(([^)]+)\)/)?.[1] || null
    const byFactory = stages.filter(s => {
      if (s.factory_name.includes(parsed.factory_name) || parsed.factory_name.includes(s.factory_name)) return true
      const nickname = nicknameOf(s.factory_name)
      return !!nickname && (nickname.includes(parsed.factory_name) || parsed.factory_name.includes(nickname))
    })
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
    ...base,
    product_id:   product.id,
    product_name: product.name,
    part_id:      part.id,
    part_name:    part.name,
    sku_color:    sku?.color_name  || parsed.sku_color  || null,
    stage_id:     stage?.id        || null,
    stage_name:   stage ? `${stage.factory_name}・${stage.action_name}` : null,
  }
}

module.exports = { parseInventoryInput, resolveIds, ACTION_LABEL, testConnection, STAGE_REQUIRED }
