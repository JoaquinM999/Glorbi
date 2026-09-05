const axios = require('axios')

const BASE_URL = (process.env.IOL_BASE_URL || 'https://api.invertironline.com').replace(/\/$/, '')
const COUNTRY = process.env.IOL_COUNTRY || 'Argentina'
const tokenStates = new Map()
const tokenRequests = new Map()

function requireCredentials(credentials) {
  if (!credentials?.username || !credentials?.password) {
    const error = new Error('Configura tus credenciales de IOL en Ajustes')
    error.code = 'iol_not_configured'
    throw error
  }
  return credentials
}

async function authenticateWith(ownerKey, body) {
  const response = await axios.post(`${BASE_URL}/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  })
  const accessToken = response.data?.access_token
  if (!accessToken) throw new Error('IOL no devolvió un access_token')
  const expiresIn = Number(response.data.expires_in || 900) * 1000
  tokenStates.set(ownerKey, {
    accessToken,
    refreshToken: response.data?.refresh_token || tokenStates.get(ownerKey)?.refreshToken || null,
    expiresAt: Date.now() + Math.max(expiresIn - 60000, 30000),
  })
  return accessToken
}

async function authenticate(ownerKey, credentials) {
  const { username, password } = requireCredentials(credentials)
  return authenticateWith(ownerKey, new URLSearchParams({ username, password, grant_type: 'password' }))
}

async function refreshAccessToken(ownerKey, credentials) {
  const refreshToken = tokenStates.get(ownerKey)?.refreshToken
  if (!refreshToken) return authenticate(ownerKey, credentials)
  try {
    return await authenticateWith(ownerKey, new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' }))
  } catch {
    tokenStates.delete(ownerKey)
    return authenticate(ownerKey, credentials)
  }
}

async function getAccessToken(ownerKey, credentials, forceRefresh = false) {
  const state = tokenStates.get(ownerKey)
  if (!forceRefresh && state && Date.now() < state.expiresAt) return state.accessToken
  if (!tokenRequests.has(ownerKey)) {
    const request = (forceRefresh ? refreshAccessToken(ownerKey, credentials) : authenticate(ownerKey, credentials))
      .finally(() => tokenRequests.delete(ownerKey))
    tokenRequests.set(ownerKey, request)
  }
  return tokenRequests.get(ownerKey)
}

async function request(ownerKey, credentials, method, path, options = {}, retried = false) {
  const accessToken = await getAccessToken(ownerKey, credentials, retried)
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${path}`,
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
      timeout: options.timeout || 15000,
    })
    return response.data
  } catch (error) {
    if (error.response?.status === 401 && !retried) {
      tokenStates.delete(ownerKey)
      return request(ownerKey, credentials, method, path, options, true)
    }
    throw error
  }
}

async function getPortfolio(ownerKey, credentials) {
  return request(ownerKey, credentials, 'GET', `/api/v2/portafolio/${encodeURIComponent(COUNTRY)}`)
}

async function getAccountStatus(ownerKey, credentials) {
  return request(ownerKey, credentials, 'GET', '/api/v2/estadocuenta')
}

async function getOperationsHistory(ownerKey, credentials, options = {}) {
  return request(ownerKey, credentials, 'GET', '/api/v2/operaciones', { params: options })
}

async function getQuotes(ownerKey, credentials, symbol) {
  if (!symbol) throw new Error('El símbolo es obligatorio para consultar una cotización de IOL')
  const market = process.env.IOL_MARKET || 'Argentina'
  return request(ownerKey, credentials, 'GET', `/api/v2/${encodeURIComponent(market)}/Titulos/${encodeURIComponent(symbol)}/Cotizacion`)
}

function clearToken(ownerKey) {
  tokenStates.delete(ownerKey)
  tokenRequests.delete(ownerKey)
}

module.exports = { getPortfolio, getAccountStatus, getOperationsHistory, getQuotes, getAccessToken, clearToken, BASE_URL, COUNTRY }
