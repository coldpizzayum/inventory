'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const { getProducts, getPartsWithStages, getStagesForPart } = require('./supabase')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Diagnostic: verify the Anthropic SDK can reach the API at all. Runs once at bot startup.
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

// Factory names often carry a parenthesised nickname workers actually say,
// e.g. "至威車銑(黑豬)" — match against that too, not just the full name.
function nicknameOf(name) {
  return name.match(/\(([^)]+)\)/)?.[1] || null
}

function findStageByFactoryName(stages, factoryName) {
  if (!factoryName) return null
  return stages.find(s => {
    if (s.factory_name.includes(factoryName) || factoryName.includes(s.factory_name)) return true
    const nickname = nicknameOf(s.factory_name)
    return !!nickname && (nickname.includes(factoryName) || factoryName.includes(nickname))
  }) || null
}

// Drives the entire conversation — Claude decides what to ask, when enough
// information is known to confirm, and when the user has actually confirmed
// or cancelled. `pending` is whatever confirm-ready data was produced last
// turn (or null), so Claude can track edits ("改成300件") across turns.
async function chat(history, pending) {
  const products = await getProducts()
  const allParts = []
  for (const product of products) {
    const parts = await getPartsWithStages(product.id)
    for (const p of parts) {
      allParts.push({ ...p, product_name: product.name, product_id: product.id })
    }
  }

  const partList = allParts
    .map(p => `- ${p.product_name} > ${p.name}（part_id: ${p.id}, product_id: ${p.product_id}）（SKU: ${p.skus?.map(s => s.color_name).join('、') || '無'}）`)
    .join('\n')

  const systemPrompt = `你是益成金屬工廠的庫存登記助手「小益」，負責幫工人登記進出貨。

## 工廠資料

產品和零件：
${partList}

動作類型：
- receive：進貨（原料從外部進來）
- return：回廠（零件從加工廠加工完回來）
- send：送出（零件送去加工廠）
- ship：大貨出貨（成品出給客戶）
- rework：重工
- scrap：報廢

## 你的任務

根據對話歷史，判斷現在的狀態：

### 狀態 1 — 需要更多資訊
如果還不知道：動作類型、零件名稱、數量
→ 自然地問一個最重要的問題
→ 回傳：{"action":"ask","reply":"你的問題"}

### 狀態 2 — 資訊齊全，等待確認
如果知道：動作、產品、零件、數量（SKU 和廠商依動作決定是否必要：回廠/送出/重工通常需要廠商）
→ 整理成確認訊息
→ 回傳：{
  "action":"confirm",
  "reply":"📋 確認這筆登記？\\n\\n動作：回廠\\n零件：L夾・鈦\\n廠商：黑豬鋁・陽極處理\\n數量：500 件",
  "data":{
    "product_id":"從上面清單複製 product_id",
    "part_id":"從上面清單複製 part_id",
    "factory_name":"使用者說的工廠名稱（沒有則 null，會由程式比對成 stage_id）",
    "sku_color":"...或null",
    "action_type":"receive|return|send|ship|rework|scrap",
    "qty":500,
    "defect_qty":0,
    "lost_qty":0,
    "note":null
  }
}

### 狀態 3 — 用戶確認送出
用戶說「確認」「是」「對」「送出」「好」「OK」「可以」
→ 回傳：{"action":"submit","reply":"✅ 已登記成功！\\n\\n回廠 L夾・鈦 黑豬鋁 500件"}

### 狀態 4 — 用戶修改某個欄位
用戶說「改數量 8件」「改成銀色」「不是回廠，是送出」
→ 更新資訊，重新確認
→ 回傳 confirm 格式，data 用更新後的值

### 狀態 5 — 用戶取消
用戶說「取消」「不要」「算了」
→ 回傳：{"action":"cancel","reply":"好的，已取消。有需要再告訴我！"}

## 重要規則
- 一次只問一個問題，不要一次問很多
- 用自然的口語，不要太正式
- 零件名稱用模糊比對，「L夾」可以比對到「L夾（筆夾）」
- 廠商名稱用模糊比對，工人常用簡稱（例如括號裡的別名）
- product_id / part_id 必須是上面清單裡實際存在的值，不要自己編
- 只回傳 JSON，不要其他文字，不要用 markdown 包裝

${pending ? `\n## 目前 pending 的登記\n${JSON.stringify(pending, null, 2)}` : ''}
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: systemPrompt,
    messages: history,
  })

  const raw = response.content[0].text.trim()
  console.log('AI 回應：', raw)

  // 多重解析策略 —— Claude 偶爾還是會包 markdown 或加雜訊文字
  let result = null
  try {
    result = JSON.parse(raw)
  } catch {}
  if (!result) {
    try {
      result = JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim())
    } catch {}
  }
  if (!result) {
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) result = JSON.parse(match[0])
    } catch {}
  }
  if (!result) {
    console.error('JSON 解析失敗，原始回應：', raw)
    return { action: 'ask', reply: raw }
  }

  // confirm 狀態下，把零件/產品名稱補完整，並把 factory_name 解析成 stage_id
  if (result.action === 'confirm' && result.data) {
    const part = allParts.find(p => p.id === result.data.part_id)
    if (part) {
      result.data.product_id   = result.data.product_id || part.product_id
      result.data.part_name    = part.name
      result.data.product_name = part.product_name
    }

    if (result.data.factory_name && !result.data.stage_id) {
      const stages = await getStagesForPart(result.data.part_id)
      const stage = findStageByFactoryName(stages, result.data.factory_name)
      if (stage) {
        result.data.stage_id   = stage.id
        result.data.stage_name = `${stage.factory_name}・${stage.action_name}`
      }
    }
  }

  return result
}

module.exports = { chat, testConnection, ACTION_LABEL }
