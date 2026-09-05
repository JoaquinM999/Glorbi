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

async function fetchIncome(days = 90) {
  // Rangos largos disparan la exportación asíncrona de Binance en el backend
  // (puede tardar varios minutos + descarga del CSV), así que necesitamos más
  // margen que el timeout default de apiClient para esta llamada puntual.
  const timeout = days > 89 ? 210000 : 20000
  const { data } = await apiClient.get(`/api/binance/income?days=${days}`, { timeout })
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
      if (['no_keys', 'decrypt_failed'].includes(err?.response?.data?.error)) return false
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
      if (['no_keys', 'decrypt_failed'].includes(err?.response?.data?.error)) return false
      // Un export largo crea un job en Binance; reintentarlo automáticamente
      // puede crear trabajos duplicados y activar el límite de exportación.
      if (days > 89) return false
      return count < 2
    },
  })
}

/**
 * Historial de ingresos agrupado por día + totales.
 * { byDay: [{ date, pnl }], totals: { realizedPnl, fundingFee, commission } }
 *
 * @param {number} days - cuántos días hacia atrás (máx. 180)
 */
export function useBinanceIncome(days = 90, enabled = true) {
  // Rangos largos (ej. "Todo" = 730 días) implican varias llamadas ventaneadas
  // a Binance — les damos más tiempo de caché para no repetir ese costo
  // cada vez que el componente se vuelve a montar.
  const staleTime = days > 90 ? 15 * 60 * 1000 : STALE.income

  return useQuery({
    queryKey: ['binance', 'income', days],
    queryFn:  () => fetchIncome(days),
    staleTime,
    enabled,
    retry: (count, err) => {
      if (['no_keys', 'decrypt_failed'].includes(err?.response?.data?.error)) return false
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
