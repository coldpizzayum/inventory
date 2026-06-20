'use strict'

process.on('uncaughtException', (err) => {
  console.error('未捕捉錯誤：', err.message)
  console.error(err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('未處理的 Promise 錯誤：', reason)
  process.exit(1)
})

const http = require('http')
const { Telegraf, Markup } = require('telegraf')
const { parseInventoryInput, resolveIds, ACTION_LABEL, testConnection, STAGE_REQUIRED } = require('./parser')
const { logInventory, getRecentLogs, getProducts, getPartsWithStages, getStagesForPart } = require('./supabase')

// Railway's edge proxy probes $PORT and SIGTERMs the process if nothing answers there.
// This bot has no web traffic of its own — this server exists only to pass that healthcheck.
const PORT = process.env.PORT || 3000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Telegram bot is running')
}).listen(PORT, () => {
  console.log(`🌐 Healthcheck server listening on port ${PORT}`)
})

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// Per-user in-progress log entry — holds whatever's been resolved/selected so
// far, whether that's the final ready-to-confirm state or a partial one still
// waiting on a product/part/stage pick.
const pendingLogs = new Map()

function buildConfirmText(resolved) {
  const action  = ACTION_LABEL[resolved.action_type] || resolved.action_type
  const sku     = resolved.sku_color  ? `・${resolved.sku_color}`         : ''
  const stage   = resolved.stage_name ? `\n廠商：${resolved.stage_name}` : ''
  const defect  = resolved.defect_qty > 0 ? `\n不良：${resolved.defect_qty} 件` : ''
  const lost    = resolved.lost_qty   > 0 ? `\n遺失：${resolved.lost_qty} 件`  : ''
  const note    = resolved.note       ? `\n備註：${resolved.note}`        : ''

  return (
    `📋 確認這筆登記？\n\n` +
    `動作：${action}\n` +
    `產品：${resolved.product_name}\n` +
    `零件：${resolved.part_name}${sku}${stage}\n` +
    `數量：${resolved.qty} 件${defect}${lost}${note}`
  )
}

const CONFIRM_KEYBOARD = Markup.inlineKeyboard([[
  Markup.button.callback('✅ 確認', 'confirm_log'),
  Markup.button.callback('❌ 取消', 'cancel_log'),
]])

// editMessageId: pass the "⏳ 解析中…" placeholder's message_id when calling
// from the plain text handler; omit it when calling from a button callback
// (those already have a message context via ctx.editMessageText).
async function showConfirmation(ctx, resolved, editMessageId) {
  const text = buildConfirmText(resolved)
  if (editMessageId) {
    await ctx.telegram.editMessageText(ctx.chat.id, editMessageId, undefined, text, CONFIRM_KEYBOARD)
  } else {
    await ctx.editMessageText(text, CONFIRM_KEYBOARD)
  }
}

// If the action needs a stage and one isn't set yet, ask which factory.
// Returns true (and shows the question) when it took over; false otherwise.
async function askStageIfNeeded(ctx, resolved, editMessageId) {
  if (!STAGE_REQUIRED.includes(resolved.action_type) || resolved.stage_id) return false

  const stages = await getStagesForPart(resolved.part_id)
  if (!stages.length) return false

  pendingLogs.set(ctx.from.id, resolved)
  const label = resolved.action_type === 'return' ? '從哪個廠回來？' : '送去哪個廠？'
  const buttons = stages.map(s => [Markup.button.callback(`${s.factory_name}・${s.action_name}`, `select_stage:${s.id}`)])

  if (editMessageId) {
    await ctx.telegram.editMessageText(ctx.chat.id, editMessageId, undefined, label, Markup.inlineKeyboard(buttons))
  } else {
    await ctx.editMessageText(label, Markup.inlineKeyboard(buttons))
  }
  return true
}

// ── /start ──────────────────────────────────────────────────────────────────
bot.start(ctx => ctx.reply(
  `👋 你好！我是益成金屬庫存登記 Bot\n\n` +
  `直接輸入登記內容，例如：\n` +
  `「L夾 鈦 從黑豬鋁回來 500件」\n` +
  `「送 500 件 L夾 鈦 去黑豬鋁」\n` +
  `「L夾 進貨 鈦 1000件」\n\n` +
  `📋 /history — 查看最近 5 筆紀錄\n` +
  `❓ /help — 輸入格式說明`
))

// ── /help ────────────────────────────────────────────────────────────────────
bot.command('help', ctx => ctx.reply(
  `📝 輸入格式說明\n\n` +
  `進貨（原料）：「L夾 鈦 進貨 1000件」\n` +
  `出貨（送加工）：「送 L夾 鈦 500件 去黑豬鋁」\n` +
  `回廠：「L夾 鈦 從黑豬鋁回來 480件」\n` +
  `不良品：「L夾 鈦 從黑豬鋁回來 480件 其中 20件不良」\n` +
  `大貨出貨：「L夾 鈦 大貨出貨 1000件」\n\n` +
  `不確定怎麼輸入？用自然語言描述，Bot 會幫你解析。`
))

// ── /history ─────────────────────────────────────────────────────────────────
bot.command('history', async ctx => {
  try {
    const logs = await getRecentLogs(5)
    if (!logs?.length) return ctx.reply('還沒有任何登記紀錄')

    const lines = logs.map(l => {
      const d = new Date(l.logged_at)
      const time = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ` +
                   `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      const action = ACTION_LABEL[l.action_type] || l.action_type
      const stage  = l.stage_name ? ` ${l.stage_name}` : ''
      const defect = (l.defect_qty || 0) > 0 ? ` / 不良 ${l.defect_qty}` : ''
      return `${time}  ${action}  ${l.part_name || '—'}${stage}  ${l.qty}件${defect}`
    })

    ctx.reply(`📋 最近 5 筆紀錄：\n\n${lines.join('\n')}`)
  } catch (err) {
    console.error('history error:', err)
    ctx.reply('讀取失敗，請稍後再試')
  }
})

// ── Callback: ✅ confirm ─────────────────────────────────────────────────────
bot.action('confirm_log', async ctx => {
  const params = pendingLogs.get(ctx.from.id)
  if (!params) return ctx.answerCbQuery('已過期，請重新輸入')

  try {
    console.log('準備登記：', JSON.stringify(params, null, 2))
    const result = await logInventory(params)
    console.log('登記完成：', result)
    pendingLogs.delete(ctx.from.id)

    const action = ACTION_LABEL[params.action_type] || params.action_type
    const sku    = params.sku_color  ? `・${params.sku_color}`  : ''
    const stage  = params.stage_name ? ` ← ${params.stage_name}` : ''
    const defect = params.defect_qty > 0 ? `\n不良：${params.defect_qty} 件` : ''
    const lost   = params.lost_qty   > 0 ? `\n遺失：${params.lost_qty} 件`  : ''

    await ctx.editMessageText(
      `✅ 已登記成功！\n\n` +
      `${action} ${params.part_name}${sku}${stage}\n` +
      `數量：${params.qty} 件${defect}${lost}`
    )
  } catch (err) {
    console.error('confirm_log error:', err)
    await ctx.editMessageText(`❌ 登記失敗：${err.message}`)
  }
  ctx.answerCbQuery()
})

// ── Callback: ❌ cancel ──────────────────────────────────────────────────────
bot.action('cancel_log', async ctx => {
  pendingLogs.delete(ctx.from.id)
  await ctx.editMessageText('已取消')
  ctx.answerCbQuery()
})

// ── Callback: 選擇產品 ───────────────────────────────────────────────────────
bot.action(/^select_product:(.+)$/, async ctx => {
  const productId = ctx.match[1]
  const prev = pendingLogs.get(ctx.from.id)
  if (!prev) return ctx.answerCbQuery('已過期，請重新輸入')

  const products = await getProducts()
  const product = products.find(p => p.id === productId)
  const parts = await getPartsWithStages(productId)
  const part = prev.part_name
    ? parts.find(p => p.name.includes(prev.part_name) || prev.part_name.includes(p.name))
    : null

  if (!part) {
    const updated = { ...prev, product_id: productId, product_name: product?.name || null }
    pendingLogs.set(ctx.from.id, updated)
    const buttons = parts.map(p => [Markup.button.callback(p.name, `select_part:${p.id}`)])
    await ctx.editMessageText('哪個零件？', Markup.inlineKeyboard(buttons))
    return ctx.answerCbQuery()
  }

  const updated = {
    ...prev,
    product_id: productId,
    product_name: product?.name || null,
    part_id: part.id,
    part_name: part.name,
  }
  if (await askStageIfNeeded(ctx, updated)) return ctx.answerCbQuery()

  pendingLogs.set(ctx.from.id, updated)
  await showConfirmation(ctx, updated)
  ctx.answerCbQuery()
})

// ── Callback: 選擇零件 ───────────────────────────────────────────────────────
bot.action(/^select_part:(.+)$/, async ctx => {
  const partId = ctx.match[1]
  const prev = pendingLogs.get(ctx.from.id)
  if (!prev?.product_id) return ctx.answerCbQuery('已過期，請重新輸入')

  const parts = await getPartsWithStages(prev.product_id)
  const part = parts.find(p => p.id === partId)
  if (!part) return ctx.answerCbQuery('找不到這個零件')

  const updated = { ...prev, part_id: part.id, part_name: part.name }
  if (await askStageIfNeeded(ctx, updated)) return ctx.answerCbQuery()

  pendingLogs.set(ctx.from.id, updated)
  await showConfirmation(ctx, updated)
  ctx.answerCbQuery()
})

// ── Callback: 選擇加工廠 ─────────────────────────────────────────────────────
bot.action(/^select_stage:(.+)$/, async ctx => {
  const stageId = ctx.match[1]
  const prev = pendingLogs.get(ctx.from.id)
  if (!prev?.part_id) return ctx.answerCbQuery('已過期，請重新輸入')

  const stages = await getStagesForPart(prev.part_id)
  const stage = stages.find(s => s.id === stageId)

  const updated = {
    ...prev,
    stage_id: stageId,
    stage_name: stage ? `${stage.factory_name}・${stage.action_name}` : null,
  }
  pendingLogs.set(ctx.from.id, updated)
  await showConfirmation(ctx, updated)
  ctx.answerCbQuery()
})

// ── Text messages ────────────────────────────────────────────────────────────
bot.on('text', async ctx => {
  const text = ctx.message.text
  if (text.startsWith('/')) return

  const thinking = await ctx.reply('⏳ 解析中…')

  try {
    // Step 1: Claude parses natural language
    const parsed = await parseInventoryInput(text)

    if (parsed.error) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        `❓ 無法理解：${parsed.error}\n\n請試試：「L夾 鈦 從黑豬鋁回來 500件」`
      )
      return
    }

    // Step 2: Resolve names → real IDs (whatever can't be resolved comes back null)
    const resolved = await resolveIds(parsed)

    // Step 3: 缺產品 → 列出所有產品讓使用者選
    if (!resolved.product_id) {
      pendingLogs.set(ctx.from.id, resolved)
      const products = await getProducts()
      const buttons = products.map(p => [Markup.button.callback(p.name, `select_product:${p.id}`)])
      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        '這是哪個產品的零件？', Markup.inlineKeyboard(buttons)
      )
      return
    }

    // Step 4: 有產品沒零件 → 列出該產品的零件讓使用者選
    if (!resolved.part_id) {
      pendingLogs.set(ctx.from.id, resolved)
      const parts = await getPartsWithStages(resolved.product_id)
      const buttons = parts.map(p => [Markup.button.callback(p.name, `select_part:${p.id}`)])
      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        '哪個零件？', Markup.inlineKeyboard(buttons)
      )
      return
    }

    // Step 5: 回廠/送加工/重工卻不確定是哪個加工廠 → 直接問
    if (await askStageIfNeeded(ctx, resolved, thinking.message_id)) return

    // Step 6: 資訊齊全，顯示確認
    pendingLogs.set(ctx.from.id, resolved)
    await showConfirmation(ctx, resolved, thinking.message_id)

  } catch (err) {
    console.error('=== BOT ERROR ===')
    console.error('用戶輸入：', text)
    console.error('錯誤訊息：', err.message)
    console.error('錯誤堆疊：', err.stack)
    console.error('=================')
    await ctx.telegram.editMessageText(
      ctx.chat.id, thinking.message_id, undefined,
      '❌ 發生錯誤，請稍後再試'
    ).catch(() => ctx.reply('❌ 發生錯誤，請稍後再試'))
  }
})

// ── Launch ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    console.log('檢查環境變數...')
    console.log('TELEGRAM_BOT_TOKEN:', !!process.env.TELEGRAM_BOT_TOKEN)
    console.log('ANTHROPIC_API_KEY:', !!process.env.ANTHROPIC_API_KEY)
    console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL)
    console.log('SUPABASE_SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_KEY)

    if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN 未設定')
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY 未設定')
    if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL 未設定')
    if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY 未設定')

    await testConnection()

    await bot.telegram.deleteWebhook({ drop_pending_updates: true })
    console.log('✅ Webhook 清除成功')

    // 409 Conflict usually means a previous deployment's long-poll hasn't
    // released yet (e.g. mid-redeploy) — retry with backoff instead of
    // exiting immediately, which would otherwise create a tight crash loop.
    const MAX_RETRIES = 5
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await bot.launch()
        console.log('✅ Bot 啟動成功')
        return
      } catch (err) {
        const is409 = err.response?.error_code === 409 || /409/.test(err.message)
        if (!is409 || attempt === MAX_RETRIES) throw err
        const delay = attempt * 3000
        console.warn(`⚠️ 啟動第 ${attempt} 次遇到 409，可能是上一個 instance 還沒釋放，${delay / 1000}s 後重試…`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  } catch (err) {
    console.error('❌ 啟動失敗：', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

start()

process.once('SIGINT',  () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
