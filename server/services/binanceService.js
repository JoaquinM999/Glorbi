/**
 * binanceService.js
 *
 * Cliente de solo lectura para la API de Binance Futures (USDT-M).
 * Firma las peticiones con HMAC-SHA256 usando la API key y secret del usuario.
 *
 * Documentación: https://binance-docs.github.io/apidocs/futures/en/
 */
const axios = require('axios')
const crypto = require('crypto')

const BASE_URL = 'https://fapi.binance.com'

// Símbolos de futuros perpetuos que se muestran en el screener
const SCREENER_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT',
  'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SEIUSDT', 'MATICUSDT',
]

// ── Helpers de firma ──────────────────────────────────────────────────────────

function sign(queryString, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex')
}

function buildSignedParams(params, secret) {
  const timestamp = Date.now()
  const allParams = { ...params, timestamp }
  const qs = new URLSearchParams(allParams).toString()
  const signature = sign(qs, secret)
  return `${qs}&signature=${signature}`
}

async function signedGet(path, params, apiKey, apiSecret) {
  const query = buildSignedParams(params, apiSecret)
  const url = `${BASE_URL}${path}?${query}`
  const response = await axios.get(url, {
    headers: { 'X-MBX-APIKEY': apiKey },
    timeout: 10000,
  })
  return response.data
}

async function publicGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`
  const response = await axios.get(url, { timeout: 10000 })
  return response.data
}

// ── Endpoints autenticados ────────────────────────────────────────────────────

/**
 * Cuenta: balances, margen, unrealized PNL total.
 * GET /fapi/v2/account
 */
async function getAccount(apiKey, apiSecret) {
  const data = await signedGet('/fapi/v2/account', {}, apiKey, apiSecret)
  const usdt = data.assets?.find((a) => a.asset === 'USDT') || {}
  return {
    totalWalletBalance:    parseFloat(usdt.walletBalance    || data.totalWalletBalance    || 0),
    totalMarginBalance:    parseFloat(usdt.marginBalance    || data.totalMarginBalance    || 0),
    totalUnrealizedProfit: parseFloat(usdt.unrealizedProfit || data.totalUnrealizedProfit || 0),
    availableBalance:      parseFloat(usdt.availableBalance || data.availableBalance       || 0),
  }
}

/**
 * Posiciones abiertas con PNL flotante.
 * GET /fapi/v2/positionRisk
 */
async function getOpenPositions(apiKey, apiSecret) {
  const data = await signedGet('/fapi/v2/positionRisk', {}, apiKey, apiSecret)
  return data
    .filter((p) => parseFloat(p.positionAmt) !== 0)
    .map((p) => ({
      symbol:          p.symbol,
      side:            parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
      positionAmt:     parseFloat(p.positionAmt),
      entryPrice:      parseFloat(p.entryPrice),
      markPrice:       parseFloat(p.markPrice),
      unrealizedProfit:parseFloat(p.unrealizedProfit),
      percentage:      parseFloat(p.percentage || 0),
      leverage:        parseInt(p.leverage || 1),
      liquidationPrice:parseFloat(p.liquidationPrice || 0),
      notional:        Math.abs(parseFloat(p.notional || 0)),
    }))
}

/**
 * Historial de ingresos: PNL realizado, funding fees, comisiones.
 * Pagina automáticamente para cubrir los últimos `days` días.
 * GET /fapi/v1/income
 */
async function getIncome(apiKey, apiSecret, days = 60) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000
  const allIncomes = []
  let currentStart = startTime

  // Binance devuelve máx. 1000 registros por llamada — paginamos si hace falta
  while (true) {
    const data = await signedGet(
      '/fapi/v1/income',
      { startTime: currentStart, limit: 1000 },
      apiKey,
      apiSecret
    )
    if (!data.length) break
    allIncomes.push(...data)
    if (data.length < 1000) break
    currentStart = data[data.length - 1].time + 1
  }

  return allIncomes
}

/**
 * Agrega el income por día → formato { date: 'YYYY-MM-DD', pnl: number }
 * que espera DashboardCharts.
 */
function aggregateIncomeByDay(incomes) {
  // Tipos que cuentan como ganancia/pérdida operativa
  const RELEVANT = new Set(['REALIZED_PNL', 'FUNDING_FEE'])

  const byDay = {}
  for (const item of incomes) {
    if (!RELEVANT.has(item.incomeType)) continue
    const date = new Date(item.time).toISOString().slice(0, 10)
    byDay[date] = (byDay[date] || 0) + parseFloat(item.income)
  }

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
}

// ── Endpoints públicos (no requieren autenticación) ───────────────────────────

/**
 * Datos 24h para todos los símbolos del screener:
 * precio, volumen, cambio porcentual.
 * GET /fapi/v1/ticker/24hr
 */
async function getTicker24h(symbols = SCREENER_SYMBOLS) {
  const allData = await publicGet('/fapi/v1/ticker/24hr')
  const wantSet = new Set(symbols)
  return allData.filter((t) => wantSet.has(t.symbol))
}

/**
 * Open Interest para un símbolo.
 * GET /fapi/v1/openInterest
 */
async function getOpenInterest(symbol) {
  const data = await publicGet('/fapi/v1/openInterest', { symbol })
  return parseFloat(data.openInterest || 0)
}

/**
 * Funding rate actual para un símbolo.
 * GET /fapi/v1/premiumIndex
 */
async function getFundingRate(symbol) {
  const data = await publicGet('/fapi/v1/premiumIndex', { symbol })
  return parseFloat(data.lastFundingRate || 0)
}

/**
 * Construye el dataset completo del screener para los símbolos definidos.
 * Hace las llamadas en paralelo para minimizar latencia.
 */
async function getScreenerData(symbols = SCREENER_SYMBOLS) {
  // Tickers 24h en una sola llamada (todos los pares)
  const tickers = await getTicker24h(symbols)
  const tickerMap = Object.fromEntries(tickers.map((t) => [t.symbol, t]))

  // OI y funding en paralelo — máximo 10 concurrentes para no saturar la API
  const results = []
  const CONCURRENCY = 10

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const [oi, fundingRate] = await Promise.all([
            getOpenInterest(symbol),
            getFundingRate(symbol),
          ])
          const t = tickerMap[symbol] || {}
          const price = parseFloat(t.lastPrice || 0)
          return {
            symbol,
            price,
            open_interest:         oi * price, // en USD
            oi_change_24h:         parseFloat(t.priceChangePercent || 0),
            funding_rate:          fundingRate,
            volume_24h:            parseFloat(t.quoteVolume || 0),
            long_short_ratio:      1.0, // no disponible en API pública estándar
            long_liquidations_24h: 0,   // requiere endpoint premium
            short_liquidations_24h:0,
          }
        } catch {
          return null
        }
      })
    )
    results.push(...batchResults.filter(Boolean))
  }

  return results.sort((a, b) => b.open_interest - a.open_interest)
}

module.exports = {
  getAccount,
  getOpenPositions,
  getIncome,
  aggregateIncomeByDay,
  getScreenerData,
  getTicker24h,
  SCREENER_SYMBOLS,
}
