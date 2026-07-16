/**
 * binance.js — rutas Express para datos de Binance Futures
 *
 * Todas las rutas requieren JWT válido (authMiddleware).
 * El backend recupera las API keys del usuario desde la BD,
 * firma las peticiones a Binance y devuelve los datos al frontend.
 * La API key y secret de Binance NUNCA llegan al navegador.
 */
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { stmts } = require('../db/database')
const {
  getAccount,
  getOpenPositions,
  getIncome,
  aggregateIncomeByDay,
  getScreenerData,
} = require('../services/binanceService')

const router = express.Router()
router.use(authMiddleware)

// ── Helper: obtener keys del usuario autenticado ──────────────────────────────
function getUserKeys(email) {
  const rows = stmts.getSettingsByOwner.all(email)
  const settings = rows[0]
  if (!settings?.binance_api_key || !settings?.binance_api_secret) {
    return null
  }
  return {
    apiKey:    settings.binance_api_key,
    apiSecret: settings.binance_api_secret,
  }
}

// ── POST /api/binance/test ────────────────────────────────────────────────────
// Verifica que un par de API key/secret sea válido ANTES de guardarlo.
// Recibe las keys en el body (no las de la BD) para poder validar antes de crear el registro.
router.post('/test', async (req, res) => {
  const { binance_api_key, binance_api_secret } = req.body
  if (!binance_api_key || !binance_api_secret) {
    return res.status(400).json({ error: 'missing_keys', message: 'Faltan API key o secret' })
  }
  try {
    const account = await getAccount(binance_api_key, binance_api_secret)
    res.json({ valid: true, account })
  } catch (err) {
    console.error('[binance/test]', err?.response?.data || err.message)
    res.status(400).json({ valid: false, message: formatBinanceError(err) })
  }
})

// ── GET /api/binance/account ──────────────────────────────────────────────────
// Wallet balance, margin balance, unrealized PNL
router.get('/account', async (req, res) => {
  const keys = getUserKeys(req.user.email)
  if (!keys) {
    return res.status(400).json({ error: 'no_keys', message: 'Configura tus API keys en Ajustes' })
  }
  try {
    const account = await getAccount(keys.apiKey, keys.apiSecret)
    res.json(account)
  } catch (err) {
    console.error('[binance/account]', err?.response?.data || err.message)
    res.status(502).json({ error: 'binance_error', message: formatBinanceError(err) })
  }
})

// ── GET /api/binance/positions ────────────────────────────────────────────────
// Posiciones abiertas con PNL flotante
router.get('/positions', async (req, res) => {
  const keys = getUserKeys(req.user.email)
  if (!keys) {
    return res.status(400).json({ error: 'no_keys', message: 'Configura tus API keys en Ajustes' })
  }
  try {
    const positions = await getOpenPositions(keys.apiKey, keys.apiSecret)
    res.json(positions)
  } catch (err) {
    console.error('[binance/positions]', err?.response?.data || err.message)
    res.status(502).json({ error: 'binance_error', message: formatBinanceError(err) })
  }
})

// ── GET /api/binance/income?days=180 ──────────────────────────────────────────
// Máximo aumentado de 90 a 180 días — el tope anterior recortaba el historial
// cuando el usuario seleccionaba "Todo" en el selector de período si tenía
// más de 90 días de operaciones.
// Historial de PNL realizado + funding agrupado por día
router.get('/income', async (req, res) => {
  const keys = getUserKeys(req.user.email)
  if (!keys) {
    return res.status(400).json({ error: 'no_keys', message: 'Configura tus API keys en Ajustes' })
  }
  const days = Math.min(parseInt(req.query.days || '90'), 180)
  try {
    const raw    = await getIncome(keys.apiKey, keys.apiSecret, days)
    const byDay  = aggregateIncomeByDay(raw)
    const totals = raw.reduce(
      (acc, item) => {
        const v = parseFloat(item.income)
        if (item.incomeType === 'REALIZED_PNL') acc.realizedPnl += v
        if (item.incomeType === 'FUNDING_FEE')  acc.fundingFee  += v
        if (item.incomeType === 'COMMISSION')    acc.commission  += v
        return acc
      },
      { realizedPnl: 0, fundingFee: 0, commission: 0 }
    )
    res.json({ byDay, totals })
  } catch (err) {
    console.error('[binance/income]', err?.response?.data || err.message)
    res.status(502).json({ error: 'binance_error', message: formatBinanceError(err) })
  }
})

// ── GET /api/binance/screener ─────────────────────────────────────────────────
// Datos del screener de derivados (público, no necesita keys)
router.get('/screener', async (_req, res) => {
  try {
    const pairs = await getScreenerData()
    res.json({ pairs })
  } catch (err) {
    console.error('[binance/screener]', err?.response?.data || err.message)
    res.status(502).json({ error: 'binance_error', message: formatBinanceError(err) })
  }
})

// ── Helper de error ───────────────────────────────────────────────────────────
function formatBinanceError(err) {
  const binanceMsg = err?.response?.data?.msg
  if (binanceMsg) return `Binance: ${binanceMsg}`
  if (err.code === 'ECONNABORTED') return 'Timeout al conectar con Binance'
  return err.message || 'Error al conectar con Binance'
}

module.exports = router
