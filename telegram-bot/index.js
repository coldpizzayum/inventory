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
const { Telegraf } = require('telegraf')
const { chat, testConnection, ACTION_LABEL, analyzeFeedback, handleFeedbackChat, detectInventoryIntent } = require('./ai')
const { logInventory, getRecentLogs, submitFeedback, getUnreadFeedback } = require('./supabase')

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

// 管理員通知用的獨立 Bot —— 只負責傳訊息/接收管理指令，不接觸工人的對話流程。
// 沒設 ADMIN_BOT_TOKEN 時 adminBot 為 null，notifyAdmin 直接跳過（不會退回用主 Bot 傳送）。
const adminBot = process.env.ADMIN_BOT_TOKEN
  ? new Telegraf(process.env.ADMIN_BOT_TOKEN)
  : null

async function notifyAdmin(message, options = {}) {
  if (!adminBot || !process.env.ADMIN_TELEGRAM_ID) return
  try {
    await adminBot.telegram.sendMessage(process.env.ADMIN_TELEGRAM_ID, message, options)
  } catch (err) {
    console.error('管理員通知失敗：', err.message)
  }
}

// 每個用戶的對話歷史和 pending 狀態 —— 純記憶體保存，重啟（每次部署）就會清空
const sessions = new Map()

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { history: [], pending: null, feedbackMode: false, feedbackHistory: [] })
  }
  return sessions.get(userId)
}

// ── /start ──────────────────────────────────────────────────────────────────
bot.start(ctx => {
  sessions.delete(ctx.from.id)
  ctx.reply(
    '👋 你好！我是益成金屬庫存登記 Bot\n\n' +
    '直接告訴我要登記什麼，例如：\n' +
    '「L夾 從黑豬鋁回來 500件」\n' +
    '「送 200件 L夾 鈦 去家佑」\n' +
    '「Pen N 筆蓋 進貨 1000」\n\n' +
    '我會幫你確認細節後登記。\n\n' +
    '📋 /history — 查看最近 5 筆紀錄\n' +
    '📝 /feedback — 回報問題或建議'
  )
})

// ── /feedback ────────────────────────────────────────────────────────────────
// 進入回饋對話模式 —— 先讓 Claude 釐清問題，能當場解決的不會打擾管理員，
// 只有真的是 bug/功能需求才會升級（見 bot.on('text') 裡的 feedbackMode 處理）
bot.command('feedback', ctx => {
  const session = getSession(ctx.from.id)
  session.feedbackMode = true
  session.feedbackHistory = []
  ctx.reply('📝 請說說你遇到什麼問題，或有什麼建議？\n\n（輸入 /cancel 取消回饋）')
})

bot.command('cancel', ctx => {
  const session = getSession(ctx.from.id)
  if (session.feedbackMode) {
    session.feedbackMode = false
    session.feedbackHistory = []
    ctx.reply('已取消回饋。')
  }
})

// 格式化一筆 receive_logs 紀錄，/history 跟管理員 Bot 的 /recent 共用
function formatLogLine(l) {
  const d = new Date(l.logged_at)
  const time = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ` +
               `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  const action = ACTION_LABEL[l.action_type] || l.action_type
  const stage  = l.stage_name ? ` ${l.stage_name}` : ''
  const defect = (l.defect_qty || 0) > 0 ? ` / 不良 ${l.defect_qty}` : ''
  return `${time}  ${action}  ${l.part_name || '—'}${stage}  ${l.qty}件${defect}`
}

// ── /history ─────────────────────────────────────────────────────────────────
// 用既有的 getRecentLogs（flat query，避免 nested select 的 PGRST125 問題）
bot.command('history', async ctx => {
  try {
    const logs = await getRecentLogs(5)
    if (!logs?.length) return ctx.reply('還沒有任何登記紀錄')
    ctx.reply(`📋 最近 5 筆紀錄：\n\n${logs.map(formatLogLine).join('\n')}`)
  } catch (err) {
    console.error('history error:', err)
    ctx.reply('讀取失敗，請稍後再試')
  }
})

const CATEGORY_LABEL = {
  bug:     '🔴 功能壞掉',
  ux:      '🟡 使用體驗',
  feature: '🟢 新功能需求',
  data:    '🟠 資料問題',
  other:   '⚪ 其他',
}
const PRIORITY_LABEL = {
  high:   '🔥 高（影響正常使用）',
  medium: '⚠️ 中（有點麻煩）',
  low:    '💡 低（小建議）',
}
const EFFORT_LABEL = {
  easy:   '✅ 容易（快速修改）',
  medium: '🔧 中等（需要一些時間）',
  hard:   '🏗️ 複雜（大改動）',
}

// HTML parse_mode 對 <, >, & 有特殊意義，使用者原話/Claude 生成的文字都要跳脫，
// 不然字句裡剛好出現這些字元（例如「數量 < 0」）會讓 Telegram 整則訊息送失敗
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatFeedbackReport(from, feedbackHistory, analysis) {
  const conversation = Array.isArray(feedbackHistory)
    ? feedbackHistory
        .map(m => `${m.role === 'user' ? `👤 ${escapeHtml(from)}` : '🤖 Bot'}：${escapeHtml(m.content)}`)
        .join('\n\n')
    : escapeHtml(feedbackHistory)

  return `<b>📩 用戶回饋 — ${escapeHtml(from)}</b>

<b>完整對話：</b>
${conversation}

━━━━━━━━━━━━━━━
<b>📊 分析報告</b>

<b>類型：</b>${CATEGORY_LABEL[analysis.category] || escapeHtml(analysis.category)}
<b>優先級：</b>${PRIORITY_LABEL[analysis.priority] || escapeHtml(analysis.priority)}
<b>摘要：</b>${escapeHtml(analysis.summary)}

<b>問題描述：</b>
${escapeHtml(analysis.problem)}

<b>影響範圍：</b>
${escapeHtml(analysis.impact)}

<b>建議解法：</b>
${escapeHtml(analysis.suggestion)}

<b>開發難度：</b>${EFFORT_LABEL[analysis.effort] || escapeHtml(analysis.effort)}

━━━━━━━━━━━━━━━
<b>${analysis.should_do ? '✅ 建議執行' : '⏸️ 暫緩考慮'}</b>
${escapeHtml(analysis.reason)}`
}

// 回饋對話真的升級成要給管理員看的問題時呼叫：分析、寫入 bot_feedback（存完整
// 對話，不只是工人的第一句話）、轉發格式化報告。
async function escalateFeedback(ctx, from, feedbackHistory) {
  const conversationText = feedbackHistory
    .map(m => `${m.role === 'user' ? `👤 ${from}` : '🤖 Bot'}：${m.content}`)
    .join('\n\n')
  const userConcern = feedbackHistory.filter(m => m.role === 'user').map(m => m.content).join('\n')

  const analysis = await analyzeFeedback(userConcern, from)

  try {
    await submitFeedback({
      telegram_user_id: String(ctx.from.id),
      telegram_name: from,
      message: conversationText,
      analysis: analysis.summary,
      category: analysis.category,
      priority: analysis.priority,
    })
  } catch (err) {
    console.error('回饋寫入失敗：', err.message)
  }

  await notifyAdmin(formatFeedbackReport(from, feedbackHistory, analysis), { parse_mode: 'HTML' })
}

// 跑一輪回饋釐清對話：問 Claude、回覆使用者，再依 action 決定要不要結束/升級。
// /feedback 流程跟自動偵測到回饋意圖後的流程都共用這個函數。
async function runFeedbackTurn(ctx, session, from) {
  const result = await handleFeedbackChat(session.feedbackHistory, from)
  session.feedbackHistory.push({ role: 'assistant', content: result.reply })
  await ctx.reply(result.reply)

  if (result.action === 'resolved') {
    session.feedbackMode = false
    session.feedbackHistory = []
  } else if (result.action === 'escalate') {
    session.feedbackMode = false
    await escalateFeedback(ctx, from, session.feedbackHistory)
    session.feedbackHistory = []
  }
  // action === 'ask' → 留在 feedbackMode，history 保留給下一輪
}

// ── 管理員 Bot：獨立的 token，只接受 ADMIN_TELEGRAM_ID 的指令 ──────────────────
if (adminBot) {
  const isAdmin = ctx => String(ctx.from.id) === process.env.ADMIN_TELEGRAM_ID

  adminBot.start(ctx => {
    if (!isAdmin(ctx)) return
    ctx.reply(
      '👋 益成管理通知 Bot\n\n' +
      '📩 有新回饋時會自動通知你\n\n' +
      '/recent — 查看最近 10 筆登記\n' +
      '/feedback — 查看未讀回饋'
    )
  })

  adminBot.command('recent', async ctx => {
    if (!isAdmin(ctx)) return
    try {
      const logs = await getRecentLogs(10)
      if (!logs?.length) return ctx.reply('還沒有任何登記紀錄')
      ctx.reply(`📋 最近 10 筆登記：\n\n${logs.map(formatLogLine).join('\n')}`)
    } catch (err) {
      console.error('admin /recent error:', err)
      ctx.reply('讀取失敗')
    }
  })

  adminBot.command('feedback', async ctx => {
    if (!isAdmin(ctx)) return
    try {
      const data = await getUnreadFeedback(5)
      if (!data?.length) return ctx.reply('✅ 沒有未讀回饋')

      const messages = data.map(d =>
        `👤 ${d.telegram_name}\n` +
        `🕐 ${new Date(d.created_at).toLocaleString('zh-TW')}\n` +
        `📝 ${d.message}\n` +
        `分析：${d.analysis || '未分析'}`
      ).join('\n\n━━━━━━━━━\n\n')

      ctx.reply(`📩 未讀回饋 ${data.length} 筆：\n\n${messages}`)
    } catch (err) {
      console.error('admin /feedback error:', err)
      ctx.reply('讀取失敗')
    }
  })
}

// ── Text messages：交給 Claude 全權管理對話 ──────────────────────────────────
bot.on('text', async ctx => {
  const userId = ctx.from.id
  const userText = ctx.message.text
  if (userText.startsWith('/')) return

  const session = getSession(userId)
  const from = ctx.from.first_name || ctx.from.username || '工人'

  // 正在回饋對話模式（剛打過 /feedback，或上一輪已經進入釐清階段）→
  // 這幾句話不進主對話歷史，交給 handleFeedbackChat 釐清/解決/升級。
  // 但如果使用者忽然講出像登記的句子（有數字+進出貨動作詞），代表他不是
  // 在回覆回饋問題，是要登記 —— 退出回饋模式，讓這句話往下走正常登記流程
  if (session.feedbackMode) {
    if (detectInventoryIntent(userText)) {
      session.feedbackMode = false
      session.feedbackHistory = []
      // 不 return，繼續往下走，讓 chat() 處理這句話
    } else {
      session.feedbackHistory.push({ role: 'user', content: userText })
      await runFeedbackTurn(ctx, session, from)
      return
    }
  }

  // 上一輪 Claude 判斷使用者在回報問題，問了「要不要轉達給管理員？」
  // 這句話是回答 —— 如果答應就進入回饋對話模式（用這句話當第一句），
  // 不然就當成這句話沒被攔截過，繼續往下走
  if (session._awaitingFeedbackConfirm) {
    session._awaitingFeedbackConfirm = false
    const feedbackText = session._pendingFeedbackText
    session._pendingFeedbackText = null

    if (/^(要|好|是|對|可以|送出|確認|ok|OK)/.test(userText.trim())) {
      session.feedbackMode = true
      session.feedbackHistory = [{ role: 'user', content: feedbackText }]
      await runFeedbackTurn(ctx, session, from)
      return
    }
  }

  session.history.push({ role: 'user', content: userText })
  if (session.history.length > 20) session.history = session.history.slice(-20)

  try {
    const result = await chat(session.history, session.pending)
    session.history.push({ role: 'assistant', content: result.reply })

    if (result.action === 'confirm' && result.data) {
      session.pending = result.data
      await ctx.reply(result.reply + '\n\n回覆「確認」或「是」送出，或告訴我要修改什麼。')

    } else if (result.action === 'submit') {
      if (!session.pending) {
        await ctx.reply('目前沒有待確認的登記內容，請先告訴我要登記什麼。')
      } else {
        try {
          console.log('準備登記：', JSON.stringify(session.pending, null, 2))
          const logged = await logInventory(session.pending)
          console.log('登記完成：', logged)
          session.history = []
          session.pending = null
          await ctx.reply(result.reply)
        } catch (err) {
          console.error('logInventory error:', err)
          await ctx.reply(`❌ 寫入失敗：${err.message}`)
        }
      }

    } else if (result.action === 'cancel') {
      session.history = []
      session.pending = null
      await ctx.reply(result.reply)

    } else if (result.action === 'feedback_suggest') {
      session._awaitingFeedbackConfirm = true
      session._pendingFeedbackText = userText
      await ctx.reply(result.reply)

    } else {
      await ctx.reply(result.reply)
    }

  } catch (err) {
    console.error('=== BOT ERROR ===')
    console.error('用戶輸入：', userText)
    console.error('錯誤訊息：', err.message)
    console.error('錯誤堆疊：', err.stack)
    console.error('=================')
    // 這次的訊息沒有得到對應的 assistant 回覆，從歷史移除，避免下一輪
    // 變成連續兩個 user role 訊息導致 Anthropic API 回 400
    session.history.pop()
    await ctx.reply('抱歉，發生錯誤，請重試。')
  }
})

// ── Launch ───────────────────────────────────────────────────────────────────
// 409 Conflict usually means a previous deployment's long-poll hasn't released
// yet (e.g. mid-redeploy) — retry with backoff instead of exiting immediately,
// which would otherwise create a tight crash loop.
async function launchWithRetry(botInstance, label) {
  const MAX_RETRIES = 5
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await botInstance.launch()
      console.log(`✅ ${label} 啟動成功`)
      return
    } catch (err) {
      const is409 = err.response?.error_code === 409 || /409/.test(err.message)
      if (!is409 || attempt === MAX_RETRIES) throw err
      const delay = attempt * 3000
      console.warn(`⚠️ ${label} 啟動第 ${attempt} 次遇到 409，可能是上一個 instance 還沒釋放，${delay / 1000}s 後重試…`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

const start = async () => {
  try {
    console.log('檢查環境變數...')
    console.log('TELEGRAM_BOT_TOKEN:', !!process.env.TELEGRAM_BOT_TOKEN)
    console.log('ANTHROPIC_API_KEY:', !!process.env.ANTHROPIC_API_KEY)
    console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL)
    console.log('SUPABASE_SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_KEY)
    console.log('ADMIN_BOT_TOKEN:', !!process.env.ADMIN_BOT_TOKEN)

    if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN 未設定')
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY 未設定')
    if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL 未設定')
    if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY 未設定')

    await testConnection()

    await bot.telegram.deleteWebhook({ drop_pending_updates: true })
    console.log('✅ Webhook 清除成功')
    await launchWithRetry(bot, 'Bot')

    // 管理員 Bot 是輔助功能 —— 啟動失敗只記錄錯誤，不應該讓主要的工人 Bot 也掛掉
    if (adminBot) {
      try {
        await adminBot.telegram.deleteWebhook({ drop_pending_updates: true })
        await launchWithRetry(adminBot, '管理員 Bot')
      } catch (err) {
        console.error('❌ 管理員 Bot 啟動失敗：', err.message)
      }
    }
  } catch (err) {
    console.error('❌ 啟動失敗：', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

start()

process.once('SIGINT',  () => { bot.stop('SIGINT');  adminBot?.stop('SIGINT')  })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); adminBot?.stop('SIGTERM') })
