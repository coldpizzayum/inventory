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

// Fetches every part (with its skus/stages already attached) across every
// product. Shared by chat() and handleFeedbackChat() — both need to point
// Claude at real product/part/factory names.
async function buildPartsIndex() {
  const products = await getProducts()
  const allParts = []
  for (const product of products) {
    const parts = await getPartsWithStages(product.id)
    for (const p of parts) {
      allParts.push({ ...p, product_name: product.name, product_id: product.id })
    }
  }
  return allParts
}

// 多重解析策略 —— Claude 偶爾還是會包 markdown 或加雜訊文字。回傳 null 代表
// 三種策略都解析失敗，呼叫端要自己決定 fallback。
function parseClaudeJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {}
  try {
    return JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim())
  } catch {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch {}
  return null
}

// Drives the entire conversation — Claude decides what to ask, when enough
// information is known to confirm, and when the user has actually confirmed
// or cancelled. `pending` is whatever confirm-ready data was produced last
// turn (or null), so Claude can track edits ("改成300件") across turns.
async function chat(history, pending) {
  const allParts = await buildPartsIndex()

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

### 狀態 6 — 這句話聽起來是在回報問題、抱怨、或建議（跟登記進出貨無關，
是在講 Bot 本身、工廠流程、或其他跟庫存登記沒關係的事）
→ 不要直接說「我只負責庫存登記」就結束對話，也不要嘗試硬湊成庫存登記
→ 自然地問使用者要不要把這句話轉達給管理員
→ 回傳：{"action":"feedback_suggest","reply":"這聽起來像是要回報問題，要不要我幫你轉達給管理員？"}

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

  const result = parseClaudeJson(raw)
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

// 把工人的回饋整理成結構化分析報告，方便管理員快速判斷要不要處理
async function analyzeFeedback(feedbackText, userName) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `你是益成金屬工廠庫存系統的產品分析師。
工人「${userName}」回報了以下問題或建議：

「${feedbackText}」

請分析這個回饋，只回傳 JSON，不要其他文字：
{
  "category": "bug（功能壞掉）| ux（使用體驗）| feature（新功能需求）| data（資料問題）| other（其他）",
  "priority": "high（影響正常使用）| medium（有點麻煩）| low（小建議）",
  "summary": "一句話摘要這個回饋",
  "problem": "用戶遇到的具體問題是什麼",
  "impact": "這個問題影響了哪些工作流程",
  "suggestion": "建議的解法或改動方向",
  "effort": "easy（簡單修改）| medium（需要一些時間）| hard（複雜改動）",
  "should_do": true或false（你建議要做這個改動嗎）,
  "reason": "建議做或不做的原因"
}`,
      }],
    })

    const raw = response.content[0].text.trim()
    const result = parseClaudeJson(raw)
    if (!result) throw new Error('無法解析分析結果：' + raw)

    return result
  } catch (err) {
    console.error('回饋分析失敗：', err.message)
    return {
      category: 'other',
      priority: 'medium',
      summary: feedbackText,
      problem: feedbackText,
      impact: '未知',
      suggestion: '需要人工判斷',
      effort: 'medium',
      should_do: false,
      reason: '分析失敗，需要人工審閱',
    }
  }
}

// 回饋對話的客服助手 —— 先嘗試釐清/自動解決工人遇到的問題，只有真的是 bug
// 或功能需求才升級給管理員。跟 chat() 共用同一份產品/零件/廠商資料，這樣
// 「黑豬鋁打成黑豬找不到」之類的問題才能直接被認出來、當場回答。
async function handleFeedbackChat(history, userName) {
  const allParts = await buildPartsIndex()
  const partList = allParts.map(p => `- ${p.product_name} > ${p.name}`).join('\n')
  const factoryNames = [...new Set(
    allParts.flatMap(p => (p.stages || []).map(s => s.factory_name))
  )].join('、')

  const systemPrompt = `你是益成金屬工廠庫存系統的客服助手，負責幫工人「${userName}」
解決使用 Telegram Bot 時遇到的問題。

## 系統資料（可以用來幫忙釐清/解決問題）

產品和零件：
${partList}

加工廠：
${factoryNames || '（目前沒有資料）'}

## Bot 的使用方式
- 直接輸入內容：「L夾 鈦 從黑豬鋁回來 500件」
- /history：查看最近紀錄
- /feedback：回報問題

## 你的任務

根據對話歷史，判斷現在的狀態：

### 狀態 1 — 還需要釐清問題
問題描述不夠清楚，需要更多資訊才能判斷
→ 問一個具體的問題
→ 回傳：{"action":"ask","reply":"你的問題"}

### 狀態 2 — 可以自動解決
問題是使用方式不對、不知道怎麼輸入、打錯零件/廠商名稱等，你能直接從上面
的系統資料找到答案
→ 解釋清楚，並問用戶這樣有沒有解決
→ 回傳：{"action":"ask","reply":"解釋和解法，最後問『這樣有解決你的問題嗎？』"}

### 狀態 3 — 用戶說問題解決了
用戶說「有」「好了」「解決了」「謝謝」「OK」之類的肯定回應
→ 回傳：{"action":"resolved","reply":"✅ 很好！有其他問題隨時告訴我。"}

### 狀態 4 — 是真正的 bug 或功能需求，無法自動解決
系統真的壞了、資料錯誤、功能不足等，不是工人用法的問題
→ 告訴用戶已記錄，會轉給管理員
→ 回傳：{"action":"escalate","reply":"感謝你的回報！我已記錄這個問題，會轉給管理員改進。如果急需協助，可以直接聯絡管理員。"}

## 常見可以自動解決的問題
- 找不到廠商：告訴用戶正確的廠商名稱（用上面的加工廠清單比對）
- 不知道零件屬於哪個產品：告訴他零件對應的產品
- 不知道怎麼輸入：提供正確的輸入範例
- Bot 沒反應：建議重新傳訊息或輸入 /start

## 常見需要上報的問題
- Bot 顯示成功但資料庫沒有紀錄
- 數字計算錯誤
- 某個廠商或零件名稱真的不在系統清單裡（不是工人打錯字）
- 功能需求

## 重要規則
- 一次只問一個問題，不要一次問很多
- 用自然的口語，不要太正式
- 只回傳 JSON，不要其他文字，不要用 markdown 包裝`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: systemPrompt,
    messages: history,
  })

  const raw = response.content[0].text.trim()
  console.log('回饋對話 AI 回應：', raw)

  const result = parseClaudeJson(raw)
  return result || { action: 'ask', reply: raw }
}

const INVENTORY_KEYWORDS = ['進貨', '回廠', '回來', '送出', '送去', '出貨', '大貨', '重工', '報廢', '件', '個', '批']

// 快速規則判斷，不呼叫 Claude API —— 在回饋對話模式裡，如果使用者忽然講出
// 看起來像登記的句子（有數字又有進出貨動作詞），就該讓正常登記流程接手，
// 而不是被回饋對話吃掉這句話。
function detectInventoryIntent(text) {
  const hasNumber = /\d+/.test(text)
  const hasKeyword = INVENTORY_KEYWORDS.some(k => text.includes(k))
  return hasNumber && hasKeyword
}

module.exports = { chat, testConnection, ACTION_LABEL, analyzeFeedback, handleFeedbackChat, detectInventoryIntent }
