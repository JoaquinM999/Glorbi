const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { db, stmts } = require('../db/database')
const { decrypt } = require('../services/cryptoService')
const { iolTestLimiter, iolSyncLimiter } = require('../middleware/rateLimiters')
const {
  getPortfolio,
  getAccountStatus,
  getOperationsHistory,
  getQuotes,
} = require('../services/iolService')

const router = express.Router()
router.use(authMiddleware)
const lastPortfolioPersist = new Map()
const activeSyncs = new Set()

router.post('/test', iolTestLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ valid: false, message: 'Ingresa usuario y contraseña de IOL' })
  }
  try {
    const credentials = { username: String(username), password: String(password) }
    const status = await getAccountStatus(`test:${req.user.email}`, credentials)
    res.json({ valid: true, totalBalance: status?.totalEnPesos || null })
  } catch (error) {
    sendIolError(res, error, true)
  }
})

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function firstValue(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item[key] !== null) return item[key]
  }
  return 0
}

function portfolioAssets(portfolio) {
  return Array.isArray(portfolio) ? portfolio : portfolio?.activos || portfolio?.Activos || []
}

function normalizePosition(item) {
  const title = item?.titulo || item?.Titulo || {}
  const ticker = String(firstValue(item, ['simbolo', 'Símbolo', 'ticker', 'Ticker', 'instrumento']) || firstValue(title, ['simbolo', 'Símbolo', 'ticker', 'Ticker']) || '').trim()
  return {
    ticker,
    description: String(firstValue(item, ['descripcion', 'Descripción', 'description', 'nombre', 'Nombre']) || firstValue(title, ['descripcion', 'Descripción', 'nombre', 'Nombre']) || ticker),
    assetType: String(firstValue(title, ['tipo', 'Tipo']) || 'OTRO'),
    currency: String(firstValue(title, ['moneda', 'Moneda']) || 'ARS'),
    market: String(firstValue(title, ['mercado', 'Mercado']) || 'Argentina'),
    quantity: number(firstValue(item, ['cantidad', 'Cantidad', 'quantity', 'disponible'])) ,
    lastPrice: number(firstValue(item, ['ultimoPrecio', 'ÚltimoPrecio', 'last_price', 'precio'])) ,
    totalValue: number(firstValue(item, ['valorizado', 'Valorizado', 'totalValue', 'total'])) ,
    profitLoss: number(firstValue(item, ['gananciaDinero', 'GananciaDinero', 'profit_loss', 'pnl', 'gananciaPorcentaje', 'GananciaPorcentaje'])) ,
    dailyChange: number(firstValue(item, ['variacionDiaria', 'VariacionDiaria', 'daily_change'])),
  }
}

function normalizeOperation(item, index) {
  return {
    operationId: String(firstValue(item, ['numero', 'Numero', 'id', 'Id']) || `${firstValue(item, ['fecha', 'Fecha'])}-${index}`),
    date: String(firstValue(item, ['fecha', 'Fecha', 'date']) || new Date().toISOString()),
    type: String(firstValue(item, ['tipo', 'Tipo', 'operacion', 'Operacion']) || 'UNKNOWN'),
    ticker: String(firstValue(item, ['simbolo', 'Símbolo', 'ticker', 'Ticker']) || ''),
    quantity: number(firstValue(item, ['cantidad', 'Cantidad', 'quantity'])),
    price: number(firstValue(item, ['precio', 'Precio', 'price'])),
    fees: number(firstValue(item, ['comision', 'Comisión', 'fees'])),
    totalAmount: number(firstValue(item, ['monto', 'Monto', 'total', 'total_amount'])),
  }
}

function accountBalances(status, positions) {
  const account = status?.cuentas?.[0] || {}
  const cash = number(firstValue(status, ['saldoDisponible', 'SaldoDisponible', 'cash', 'efectivo'])) || number(firstValue(account, ['disponible', 'Disponible']))
  const total = number(firstValue(status, ['totalEnPesos'])) || number(firstValue(account, ['total', 'Total'])) || positions.reduce((sum, item) => sum + item.totalValue, 0) + cash
  return { totalBalance: total, cashBalance: cash, investedBalance: Math.max(total - cash, 0) }
}

async function syncIol(ownerKey, credentials) {
  const [portfolio, status, operations] = await Promise.all([
    getPortfolio(ownerKey, credentials),
    getAccountStatus(ownerKey, credentials),
    getOperationsHistory(ownerKey, credentials),
  ])
  const positions = portfolioAssets(portfolio).map(normalizePosition).filter((item) => item.ticker)
  const transactions = (Array.isArray(operations) ? operations : operations?.operaciones || operations?.Operaciones || []).map(normalizeOperation)

  const sync = dbTransaction(() => {
    stmts.clearIolPositions.run(ownerKey)
    positions.forEach((item) => stmts.upsertIolPosition.run(ownerKey, item.ticker, item.description, item.quantity, item.lastPrice, item.totalValue, item.profitLoss))
    transactions.forEach((item) => stmts.upsertIolTransaction.run(ownerKey, item.operationId, item.date, item.type, item.ticker, item.quantity, item.price, item.fees, item.totalAmount))
    const balances = accountBalances(status, positions)
    stmts.upsertPortfolioDailyHistory.run(ownerKey, new Date().toISOString().slice(0, 10), balances.totalBalance, balances.cashBalance, balances.investedBalance)
    return balances
  })

  return { positions, transactions, ...sync }
}

function getIolCredentials(ownerKey) {
  const settings = stmts.getSettingsByOwner.all(ownerKey)[0]
  if (!settings?.iol_username || !settings?.iol_password) {
    const error = new Error('Configura tus credenciales de IOL en Ajustes')
    error.code = 'iol_not_configured'
    throw error
  }
  try {
    return { username: decrypt(settings.iol_username), password: decrypt(settings.iol_password) }
  } catch {
    const error = new Error('No se pudieron descifrar las credenciales de IOL')
    error.code = 'iol_decrypt_failed'
    throw error
  }
}

function dbTransaction(callback) {
  return db.transaction(callback)()
}

function persistPortfolioSnapshot(ownerKey, positions, balances) {
  const now = Date.now()
  if (now - (lastPortfolioPersist.get(ownerKey) || 0) < 60000) return
  dbTransaction(() => {
    stmts.clearIolPositions.run(ownerKey)
    positions.forEach((item) => stmts.upsertIolPosition.run(ownerKey, item.ticker, item.description, item.quantity, item.lastPrice, item.totalValue, item.profitLoss))
    stmts.upsertPortfolioDailyHistory.run(ownerKey, new Date().toISOString().slice(0, 10), balances.totalBalance, balances.cashBalance, balances.investedBalance)
  })
  lastPortfolioPersist.set(ownerKey, now)
}

router.get('/portfolio', async (req, res) => {
  try {
    const credentials = getIolCredentials(req.user.email)
    const [portfolio, status] = await Promise.all([getPortfolio(req.user.email, credentials), getAccountStatus(req.user.email, credentials)])
    const positions = portfolioAssets(portfolio).map(normalizePosition).filter((item) => item.ticker)
    const balances = accountBalances(status, positions)
    persistPortfolioSnapshot(req.user.email, positions, balances)
    res.json({ positions, ...balances, rawStatus: status })
  } catch (error) {
    sendIolError(res, error)
  }
})

router.get('/history', async (req, res) => {
  try {
    getIolCredentials(req.user.email)
    const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '25', 10), 1), 100)
    const offset = (page - 1) * limit
    const rows = stmts.getIolTransactions.all(req.user.email, limit, offset)
    const total = stmts.countIolTransactions.get(req.user.email).count
    res.json({ items: rows, page, limit, total, pages: Math.ceil(total / limit) })
  } catch (error) {
    sendIolError(res, error)
  }
})

router.get('/performance', (req, res) => {
  try {
    getIolCredentials(req.user.email)
    const daysByPeriod = { '1D': 1, '1W': 7, '1M': 31, '1Y': 366, ALL: 0 }
    const period = String(req.query.period || '1M').toUpperCase()
    const days = daysByPeriod[period] ?? daysByPeriod['1M']
    const start = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : '0000-01-01'
    res.json({ period, series: stmts.getPortfolioDailyHistory.all(req.user.email, start) })
  } catch (error) {
    sendIolError(res, error)
  }
})

router.post('/sync', iolSyncLimiter, async (req, res) => {
  try {
    if (activeSyncs.has(req.user.email)) {
      return res.status(409).json({ error: 'sync_in_progress', message: 'Ya hay una sincronización IOL en curso' })
    }
    const credentials = getIolCredentials(req.user.email)
    activeSyncs.add(req.user.email)
    try {
      res.json({ syncedAt: new Date().toISOString(), ...await syncIol(req.user.email, credentials) })
    } finally {
      activeSyncs.delete(req.user.email)
    }
  } catch (error) {
    sendIolError(res, error)
  }
})

router.get('/quotes/:symbol', async (req, res) => {
  try {
    const credentials = getIolCredentials(req.user.email)
    res.json(await getQuotes(req.user.email, credentials, req.params.symbol))
  } catch (error) {
    sendIolError(res, error)
  }
})

function sendIolError(res, error, isTest = false) {
  const status = ['iol_not_configured', 'iol_decrypt_failed'].includes(error.code) ? 503 : error.response?.status === 401 ? 502 : 502
  res.status(isTest && status === 502 ? 400 : status).json({ error: error.code || 'iol_error', message: error.response?.data?.message || error.message || 'Error al conectar con IOL' })
}

module.exports = router