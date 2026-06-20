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
const { chat, testConnection, ACTION_LABEL } = require('./ai')
const { logInventory, getRecentLogs, submitFeedback } = require('./supabase')

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

// 每個用戶的對話歷史和 pending 狀態 —— 純記憶體保存，重啟（每次部署）就會清空
const sessions = new Map()

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { history: [], pending: null })
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
bot.command('feedback', ctx => {
  const session = getSession(ctx.from.id)
  session._waitingForFeedback = true
  ctx.reply('📝 請直接輸入你遇到的問題或建議，\n我會轉交給管理員。')
})

// ── /history ─────────────────────────────────────────────────────────────────
// 用既有的 getRecentLogs（flat query，避免 nested select 的 PGRST125 問題）
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

// ── Text messages：交給 Claude 全權管理對話 ──────────────────────────────────
bot.on('text', async ctx => {
  const userId = ctx.from.id
  const userText = ctx.message.text
  if (userText.startsWith('/')) return

  const session = getSession(userId)

  // 正在等使用者輸入回饋內容（剛打過 /feedback）→ 這句話不進對話歷史，
  // 不丟給 Claude，直接寫入 bot_feedback 並轉發給管理員
  if (session._waitingForFeedback) {
    session._waitingForFeedback = false
    const feedbackText = userText
    const from = ctx.from.first_name || ctx.from.username || '工人'

    try {
      await submitFeedback({ telegram_user_id: String(ctx.from.id), telegram_name: from, message: feedbackText })
    } catch (err) {
      console.error('回饋寫入失敗：', err.message)
    }

    if (process.env.ADMIN_TELEGRAM_ID) {
      try {
        await bot.telegram.sendMessage(
          process.env.ADMIN_TELEGRAM_ID,
          `📩 新回饋來自 ${from}：\n\n${feedbackText}`
        )
      } catch (err) {
        console.error('轉發給管理員失敗：', err.message)
      }
    }

    await ctx.reply('✅ 已收到你的回饋，謝謝！')
    return
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
