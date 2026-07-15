/**
 * useBinanceData.js
 *
 * Hooks de React Query para todos los endpoints de Binance.
 * El backend actúa como proxy y firma las peticiones — las keys
 * de Binance nunca salen del servidor.
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/apiClient'

// ── Constantes de caché ───────────────────────────────────────────────────────
const STALE = {
  account:   30 * 1000,       // 30s  — balance cambia frecuentemente
  positions: 15 * 1000,       // 15s  — posiciones en tiempo real
  income:    5 * 60 * 1000,   // 5min — historial no cambia tan seguido
  screener:  60 * 1000,       // 1min — OI y funding
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchAccount() {
  const { data } = await apiClient.get('/api/binance/account')
  return data
}

async function fetchPositions() {
  const { data } = await apiClient.get('/api/binance/positions')
  return data
}

async function fetchIncome(days = 60) {
  const { data } = await apiClient.get(`/api/binance/income?days=${days}`)
  return data
}

async function fetchScreener() {
  const { data } = await apiClient.get('/api/binance/screener')
  return data.pairs || []
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Balance, margen y PNL flotante total de la cuenta.
 * { totalWalletBalance, totalMarginBalance, totalUnrealizedProfit, availableBalance }
 */
export function useBinanceAccount(enabled = true) {
  return useQuery({
    queryKey: ['binance', 'account'],
    queryFn:  fetchAccount,
    staleTime: STALE.account,
    refetchInterval: STALE.account,
    enabled,
    retry: (count, err) => {
      // No reintentar si el usuario no tiene keys configuradas
      if (err?.response?.data?.error === 'no_keys') return false
      return count < 2
    },
  })
}

/**
 * Posiciones abiertas con PNL flotante por posición.
 * Array de { symbol, side, positionAmt, entryPrice, markPrice,
 *            unrealizedProfit, percentage, leverage, liquidationPrice, notional }
 */
export function useBinancePositions(enabled = true) {
  return useQuery({
    queryKey: ['binance', 'positions'],
    queryFn:  fetchPositions,
    staleTime: STALE.positions,
    refetchInterval: STALE.positions,
    enabled,
    retry: (count, err) => {
      if (err?.response?.data?.error === 'no_keys') return false
      return count < 2
    },
  })
}

/**
 * Historial de ingresos agrupado por día + totales.
 * { byDay: [{ date, pnl }], totals: { realizedPnl, fundingFee, commission } }
 *
 * @param {number} days - cuántos días hacia atrás (máx. 90)
 */
export function useBinanceIncome(days = 60, enabled = true) {
  return useQuery({
    queryKey: ['binance', 'income', days],
    queryFn:  () => fetchIncome(days),
    staleTime: STALE.income,
    enabled,
    retry: (count, err) => {
      if (err?.response?.data?.error === 'no_keys') return false
      return count < 2
    },
  })
}

/**
 * Datos del screener: top pares de futuros perpetuos con OI, funding, volumen.
 * Array de { symbol, price, open_interest, oi_change_24h, funding_rate, volume_24h }
 */
export function useBinanceScreener() {
  return useQuery({
    queryKey: ['binance', 'screener'],
    queryFn:  fetchScreener,
    staleTime: STALE.screener,
    refetchInterval: STALE.screener,
    retry: 2,
  })
}
