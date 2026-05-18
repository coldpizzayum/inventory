import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import { initDb } from './db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import partRoutes from './routes/parts.js'
import receiveLogRoutes from './routes/receiveLogs.js'
import alertRoutes from './routes/alerts.js'
import exportRoutes from './routes/export.js'
import designerTokenRoutes from './routes/designerTokens.js'
import brandRoutes from './routes/brand.js'
import brandsRoutes from './routes/brands.js'
import packingItemRoutes from './routes/packingItems.js'
import workersRoutes from './routes/workers.js'
import defectLogsRoutes from './routes/defectLogs.js'
import stockAdjustmentsRoutes from './routes/stockAdjustments.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/parts', partRoutes)
app.use('/api/receive-logs', receiveLogRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/designer-tokens', designerTokenRoutes)
app.use('/api/brand', brandRoutes)
app.use('/api/brands', brandsRoutes)
app.use('/api/packing-items', packingItemRoutes)
app.use('/api/workers', workersRoutes)
app.use('/api/defect-logs', defectLogsRoutes)
app.use('/api/stock-adjustments', stockAdjustmentsRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))

// Serve built React frontend (production only)
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback: non-API routes all return index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}  [${dbType}]`)
    })
  })
  .catch(err => {
    console.error('❌ DB init failed:', err.message)
    process.exit(1)
  })
