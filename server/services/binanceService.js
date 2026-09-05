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
const zlib = require('zlib')
const AdmZip = require('adm-zip')

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
 *
 * NOTA IMPORTANTE: Binance usa "unRealizedProfit" (con R mayúscula) en este
 * endpoint específico — es una inconsistencia conocida de su API. El endpoint
 * /fapi/v2/account usa "unrealizedProfit" (minúscula) para los assets. Si no
 * se lee el campo exacto, parseFloat(undefined) = NaN y el PNL se muestra
 * siempre como $0.00 aunque la posición tenga ganancia o pérdida real.
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
      // ⚠️ Campo correcto: unRealizedProfit (R mayúscula) — NO unrealizedProfit
      unrealizedProfit:parseFloat(p.unRealizedProfit ?? p.unrealizedProfit ?? 0),
      percentage:      parseFloat(p.percentage || 0),
      leverage:        parseInt(p.leverage || 1),
      liquidationPrice:parseFloat(p.liquidationPrice || 0),
      notional:        Math.abs(parseFloat(p.notional || 0)),
    }))
}

/**
 * Historial de ingresos: PNL realizado, funding fees, comisiones.
 * GET /fapi/v1/income
 *
 * DESCUBRIMIENTO IMPORTANTE (corrige el intento anterior con "ventanas"):
 * /fapi/v1/income NO tiene un límite de "días por llamada" que se pueda
 * evitar paginando o dividiendo en ventanas — tiene un límite de RETENCIÓN
 * DE DATOS: Binance solo guarda ahí los últimos ~3 meses, sin importar qué
 * startTime le mandes. Pedir startTime de hace 8 meses a este endpoint no
 * trae nada de esos 8 meses, porque el dato ni siquiera está ahí — dividir
 * en ventanas de 89 días (mi intento anterior) no soluciona esto porque el
 * problema no es el tamaño de la ventana, es que Binance no retiene el dato.
 *
 * La solución real: Binance expone un endpoint de EXPORTACIÓN ASÍNCRONA
 * (el mismo mecanismo que usa su web cuando exportás tu historial a CSV),
 * que sí puede traer el historial completo de la cuenta:
 *   1. GET /fapi/v1/income/asyn         → pide que preparen el archivo
 *   2. GET /fapi/v1/income/asyn/id      → consultamos hasta que esté listo
 *   3. Descargamos el CSV desde la URL que nos dan
 *
 * Para rangos cortos (<= 89 días) usamos el endpoint rápido normal, porque
 * no hace falta pasar por todo el proceso de descarga asíncrona.
 * Para rangos largos, combinamos: descarga asíncrona (histórico completo)
 * + endpoint rápido (últimos 89 días, por si el export aún no incluye lo
 * más reciente), deduplicando el resultado final.
 */
async function getIncome(apiKey, apiSecret, days = 90) {
  const now = Date.now()
  const totalStart = now - days * 24 * 60 * 60 * 1000

  if (days <= 89) {
    return await getIncomeFast(apiKey, apiSecret, totalStart, now)
  }

  // Rango largo: combinar exportación asíncrona (historial completo real)
  // con el endpoint rápido (para asegurar que lo más reciente esté incluido).
  let fullHistory = []
  try {
    fullHistory = await getIncomeViaAsyncExport(apiKey, apiSecret, totalStart, now)
    console.log(`[binance] Exportación asíncrona OK: ${fullHistory.length} registros históricos`)
  } catch (err) {
    // Log completo — incluye lo que Binance realmente respondió, no solo
    // el mensaje genérico de axios, para poder diagnosticar la causa real
    // en vez de adivinar.
    console.error('[binance] ✗ Falló la exportación asíncrona, cayendo a solo datos recientes.')
    console.error('[binance]   Mensaje:', err.message)
    if (err.response?.data) {
      console.error('[binance]   Respuesta de Binance:', JSON.stringify(err.response.data))
    }
    if (err.response?.status) {
      console.error('[binance]   Status HTTP:', err.response.status)
    }
  }

  const recentStart = now - 89 * 24 * 60 * 60 * 1000
  const recent = await getIncomeFast(apiKey, apiSecret, recentStart, now)

  return dedupeIncome([...fullHistory, ...recent])
}

/**
 * Vía rápida: consulta directa al endpoint normal, paginando si hace falta.
 * Solo confiable para rangos de hasta ~90 días (ver nota arriba).
 */
async function getIncomeFast(apiKey, apiSecret, startTime, endTime) {
  const allIncomes = []
  let currentStart = startTime
  let pageCount = 0
  const MAX_PAGES = 30

  while (pageCount < MAX_PAGES) {
    const data = await signedGet(
      '/fapi/v1/income',
      { startTime: currentStart, endTime, limit: 1000 },
      apiKey,
      apiSecret
    )
    pageCount++
    if (!data.length) break
    allIncomes.push(...data)
    if (data.length < 1000) break
    currentStart = data[data.length - 1].time + 1
  }

  return allIncomes
}

/**
 * Vía completa: pide la exportación asíncrona del historial y espera a que
 * esté lista, después descarga y parsea el CSV resultante.
 *
 * Binance puede tardar más de un minuto en preparar el archivo según
 * el tamaño del historial. Hacemos polling con backoff y un tope de tiempo — si no
 * está listo a tiempo, devolvemos array vacío (el caller ya tiene el
 * fallback de datos recientes vía getIncomeFast).
 */
async function getIncomeViaAsyncExport(apiKey, apiSecret, startTime, endTime) {
  // Salvaguarda: Binance rechaza con error -4165 ("Maximum time interval is
  // 365 days") cualquier pedido que supere ese rango. Si por algún motivo
  // esta función es llamada con un rango mayor, lo recortamos acá en vez
  // de dejar que Binance devuelva un 400 y perder toda la exportación.
  const MAX_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000
  if (endTime - startTime > MAX_INTERVAL_MS) {
    const clampedStart = endTime - MAX_INTERVAL_MS
    console.warn(`[binance] Rango pedido excede 365 días, recortando a los últimos 365 días (límite de Binance)`)
    startTime = clampedStart
  }

  // Paso 1: pedir el job de exportación
  const jobResponse = await signedGet(
    '/fapi/v1/income/asyn',
    { startTime, endTime },
    apiKey,
    apiSecret
  )
  const downloadId = jobResponse.downloadId
  console.log(`[binance] Job de exportación creado: downloadId=${downloadId}`)
  if (!downloadId) {
    throw new Error(`Binance no devolvió downloadId. Respuesta completa: ${JSON.stringify(jobResponse)}`)
  }

  // Paso 2: polling espaciado hasta que el archivo esté listo. El backoff
  // reduce el peso de las consultas mientras Binance procesa el export.
  const MAX_WAIT_MS = 180000
  const POLL_DELAYS_MS = [3000, 5000, 8000, 12000, 15000]
  const startedAt = Date.now()
  let downloadUrl = null
  let attempt = 0

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    const delay = POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)]
    await new Promise((r) => setTimeout(r, delay))
    attempt++
    const statusResponse = await signedGet(
      '/fapi/v1/income/asyn/id',
      { downloadId },
      apiKey,
      apiSecret
    )
    console.log(`[binance] Poll #${attempt}: status=${statusResponse.status}`)
    if (statusResponse.status === 'completed' && statusResponse.url) {
      downloadUrl = statusResponse.url
      break
    }
    if (statusResponse.status === 'failed') {
      throw new Error('Binance marcó la exportación como fallida')
    }
    // status === 'processing' → seguimos esperando
  }

  if (!downloadUrl) {
    throw new Error(`Timeout: la exportación siguió en estado "processing" después de ${MAX_WAIT_MS / 1000}s (${attempt} intentos)`)
  }

  // Paso 3: descargar el archivo (no requiere firma, es una URL pre-firmada
  // de Binance). Se pide como binario (arraybuffer) porque el archivo puede
  // venir comprimido — pedirlo como 'text' directamente rompía el parseo
  // silenciosamente cuando Binance devolvía un ZIP en vez de CSV plano.
  const fileResponse = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 25000 })
  const csvText = extractCsvText(Buffer.from(fileResponse.data))
  return parseIncomeCsv(csvText)
}

/**
 * Parsea el CSV que devuelve la exportación de Binance a la misma forma
 * de objeto que usa el endpoint normal: { incomeType, income, time, tranId }.
 *
 * El nombre exacto de columnas puede variar levemente, así que se buscan
 * por varias alternativas conocidas en vez de asumir un único formato fijo.
 */
/**
 * Detecta el formato real del archivo que Binance devuelve, mirando los
 * primeros bytes (magic numbers), en vez de asumir que siempre es texto
 * plano. Esta era la causa de que "Todo" siguiera trayendo solo 88-89 días:
 * Binance devuelve el export como ZIP, y leerlo como texto plano producía
 * basura binaria que el parser de CSV no reconocía como filas válidas —
 * 0 registros parseados, sin ningún error visible, siempre cayendo al
 * fallback de datos recientes (que es exactamente esos ~88-89 días).
 */
function extractCsvText(buffer) {
  const isZip  = buffer[0] === 0x50 && buffer[1] === 0x4b // "PK"
  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b

  if (isZip) {
    console.log('[binance] Archivo detectado como ZIP, extrayendo...')
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    if (!entries.length) {
      throw new Error('El ZIP de Binance llegó vacío, sin ningún archivo adentro')
    }
    const csvEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.csv')) || entries[0]
    console.log(`[binance] Extrayendo ${csvEntry.entryName} del ZIP`)
    return csvEntry.getData().toString('utf8')
  }

  if (isGzip) {
    console.log('[binance] Archivo detectado como GZIP, descomprimiendo...')
    return zlib.gunzipSync(buffer).toString('utf8')
  }

  console.log('[binance] Archivo detectado como texto plano (CSV directo)')
  return buffer.toString('utf8')
}

function parseIncomeCsv(csvText) {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  // Algunos exports incluyen un título o metadatos antes del encabezado CSV.
  const headerIndex = lines.findIndex((line) => {
    const columns = parseCsvLine(line).map(normalizeColumnName)
    return (
      (columns.includes('incometype') || columns.includes('type')) &&
      (columns.includes('income') || columns.includes('amount')) &&
      (columns.includes('utctime') || columns.includes('dateutc') || columns.includes('time'))
    )
  })
  if (headerIndex === -1) {
    console.warn('[binance] No se encontró encabezado de income en el CSV:', lines[0])
    return []
  }

  const headers = parseCsvLine(lines[headerIndex])

  const findCol = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex((header) => normalizeColumnName(header) === normalizeColumnName(name))
      if (idx !== -1) return idx
    }
    return -1
  }

  const idxType   = findCol('Income_Type', 'Income Type', 'incomeType', 'Type')
  const idxIncome = findCol('Income', 'income', 'Amount')
  const idxTime   = findCol('UTC_Time', 'UTC Time', 'Date(UTC)', 'Date UTC', 'Time', 'time', 'Timestamp')
  const idxTranId = findCol('Transaction_ID', 'Transaction ID', 'Tran_ID', 'Tran ID', 'tranId', 'Trade_ID', 'tradeId')

  const results = []
  for (const line of lines.slice(headerIndex + 1)) {
    const cols = parseCsvLine(line)
    if (cols.length < headers.length) continue

    const rawTime = idxTime !== -1 ? cols[idxTime]?.replace(/^"|"$/g, '') : null
    let timeMs = null
    if (rawTime) {
      // Timestamps en el CSV suelen venir como "2024-01-15 03:04:05" en UTC,
      // sin sufijo de zona horaria — hay que forzar la interpretación UTC.
      const numericTime = Number(rawTime)
      if (Number.isFinite(numericTime)) {
        timeMs = numericTime < 100000000000 ? numericTime * 1000 : numericTime
      } else {
        const isoLike = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T') + 'Z'
        const parsed = Date.parse(isoLike)
        timeMs = isNaN(parsed) ? null : parsed
      }
    }
    if (!timeMs) continue

    results.push({
      incomeType: normalizeIncomeType(idxType !== -1 ? cols[idxType] : ''),
      income:     idxIncome !== -1 ? cols[idxIncome] : '0',
      time:       timeMs,
      tranId:     idxTranId !== -1 ? cols[idxTranId] : undefined,
    })
  }

  console.log(`[binance] CSV de exportación: ${results.length} registros parseados`)
  return results
}

function normalizeIncomeType(value) {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases = {
    'realized_pnl': 'REALIZED_PNL',
    'realized_pnl_(income)': 'REALIZED_PNL',
    'realized_profit': 'REALIZED_PNL',
    'funding_fee': 'FUNDING_FEE',
    'commission': 'COMMISSION',
    'trading_fee': 'COMMISSION',
  }
  return aliases[normalized] || value.trim().toUpperCase()
}

function normalizeColumnName(name) {
  return name.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseCsvLine(line) {
  const columns = []
  let column = ''
  let quoted = false

  for (let index = 0; index < line.length; index++) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"' && quoted && nextCharacter === '"') {
      column += '"'
      index++
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      columns.push(column.trim())
      column = ''
    } else {
      column += character
    }
  }

  columns.push(column.trim())
  return columns
}

/**
 * Deduplica registros de income combinando la exportación asíncrona con
 * los datos recientes del endpoint rápido, evitando contar dos veces
 * transacciones que puedan aparecer en ambas fuentes.
 */
function dedupeIncome(incomes) {
  const seen = new Set()
  return incomes.filter((item) => {
    const key = item.tranId ?? `${item.time}-${item.incomeType}-${item.income}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
