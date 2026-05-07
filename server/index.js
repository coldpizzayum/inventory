import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config()

import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import partRoutes from './routes/parts.js'
import receiveLogRoutes from './routes/receiveLogs.js'
import alertRoutes from './routes/alerts.js'
import exportRoutes from './routes/export.js'
import designerTokenRoutes from './routes/designerTokens.js'
import brandRoutes from './routes/brand.js'
import packingItemRoutes from './routes/packingItems.js'

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
app.use('/api/packing-items', packingItemRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
