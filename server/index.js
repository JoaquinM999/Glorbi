require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const userSettingsRoutes = require('./routes/userSettings')
const aiRoutes = require('./routes/ai')
const binanceRoutes = require('./routes/binance')
const newsRoutes = require('./routes/news')

const app = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '2mb' }))

// ── Request logger (dev) ──────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/auth', authRoutes)
app.use('/api/user-settings', userSettingsRoutes)
app.use('/api/binance', binanceRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/ai', aiRoutes) // Opcional — ver nota abajo

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const hasAIKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)

app.listen(PORT, () => {
  console.log(`\n✅ Glorbi API corriendo en http://localhost:${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   Binance Futures: activo`)
  console.log(`   Auth (JWT + SQLite): activo`)
  console.log(
    hasAIKey
      ? `   AI Executive Summary: activo (${process.env.AI_PROVIDER || 'anthropic'})`
      : `   AI Executive Summary: DESACTIVADO (opcional — no se configuró ninguna API key de IA, todo lo demás funciona igual)`
  )
  console.log('')
})
