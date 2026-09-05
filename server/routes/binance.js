/**
 * binance.js — rutas Express para datos de Binance Futures
 *
 * FIX: getUserKeys() llamaba a decrypt() FUERA de cualquier try/catch.
 * Si decrypt() fallaba (ENCRYPTION_KEY faltante, o un valor guardado con
 * formato corrupto), el throw síncrono dentro de un handler async se
 * convertía en una promesa rechazada sin manejar — Express 4 no la
 * captura sola, así que la respuesta quedaba colgada o llegaba en un
 * formato inesperado al frontend (causando errores como
 * "openPos.map is not a function", porque el frontend recibía algo
 * que no era el array esperado).
 *
 * Ahora getUserKeys() está envuelta en try/catch en cada ruta, y SIEMPRE
 * devuelve JSON limpio con un status HTTP correcto, nunca deja la
 * request colgada.
 */
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { stmts } = require('../db/database')
const { decrypt } = require('../services/cryptoService')
const {
  getAccount,
  getOpenPositions,
  getIncome,
  aggregateIncomeByDay,
  getScreenerData,
} = require('../services/binanceService')

const router = express.Router()
const { binanceTestLimiter } = require('../middleware/rateLimiters')
router.use(authMiddleware)

// ── Helper: obtener keys del usuario autenticado (descifradas) ───────────────
// Lanza un Error con `.code` para que cada ruta decida el status HTTP correcto.
function getUserKeys(email) {
  const rows = stmts.getSettingsByOwner.all(email)
  const settings = rows[0]
  if (!settings?.binance_api_key || !settings?.binance_api_secret) {
    const err = new Error('no_keys')
    err.code = 'no_keys'
    throw err
  }
  try {
    return {
      apiKey:    decrypt(settings.binance_api_key),
      apiSecret: decrypt(settings.binance_api_secret),
    }
  } catch (decryptErr) {
    console.error('[binance] Error al descifrar keys:', decryptErr.message)
    const err = new Error('decrypt_failed')
    err.code = 'decrypt_failed'
    throw err
  }
}

/**
 * Envuelve una ruta que necesita las keys del usuario, manejando todos los
 * casos de error de forma consistente. Siempre responde JSON, nunca cuelga.
 */
function withUserKeys(handler) {
  return async (req, res) => {
    let keys
    try {
      keys = getUserKeys(req.user.email)
    } catch (err) {
      if (err.code === 'no_keys') {
        return res.status(400).json({ error: 'no_keys', message: 'Configura tus API keys en Ajustes' })
      }
      if (err.code === 'decrypt_failed') {
        return res.status(500).json({
          error: 'decrypt_failed',
          message: 'No se pudieron leer tus API keys guardadas. Verificá que ENCRYPTION_KEY esté configurada en server/.env, o volvé a guardar tus keys en Ajustes.',
        })
      }
      console.error('[binance] Error inesperado obteniendo keys:', err)
      return res.status(500).json({ error: 'internal_error', message: 'Error interno del servidor' })
    }

    try {
      await handler(req, res, keys)
    } catch (err) {
      console.error('[binance]', err?.response?.data || err.message)
      res.status(502).json({ error: 'binance_error', message: formatBinanceError(err) })
    }
  }
}

// ── POST /api/binance/test ────────────────────────────────────────────────────
// Verifica que un par de API key/secret sea válido ANTES de guardarlo.
router.post('/test', binanceTestLimiter, async (req, res) => {
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
router.get('/account', withUserKeys(async (req, res, keys) => {
  const account = await getAccount(keys.apiKey, keys.apiSecret)
  res.json(account)
}))

// ── GET /api/binance/positions ────────────────────────────────────────────────
// Siempre devuelve un array — nunca un objeto suelto, para que el frontend
// pueda hacer .map() con seguridad.
router.get('/positions', withUserKeys(async (req, res, keys) => {
  const positions = await getOpenPositions(keys.apiKey, keys.apiSecret)
  res.json(Array.isArray(positions) ? positions : [])
}))

// ── GET /api/binance/income?days=180 ──────────────────────────────────────────
router.get('/income', withUserKeys(async (req, res, keys) => {
  // Ahora que getIncome() divide en ventanas de 89 días respetando el límite
  // real de Binance, sí podemos pedir rangos largos de verdad — hasta 2 años.
  // Binance limita el endpoint de exportación asíncrona a un máximo de 365
  // días por pedido (error -4165 si se supera) — por eso el tope es 365,
  // no un número mayor. Pedir más simplemente hace que Binance rechace
  // el pedido completo con un 400.
  const days = Math.min(parseInt(req.query.days || '90'), 365)
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
  res.json({ byDay: Array.isArray(byDay) ? byDay : [], totals })
}))

// ── GET /api/binance/screener ─────────────────────────────────────────────────
// Público — no necesita keys de usuario.
router.get('/screener', async (_req, res) => {
  try {
    const pairs = await getScreenerData()
    res.json({ pairs: Array.isArray(pairs) ? pairs : [] })
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
