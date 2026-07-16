/**
 * Dashboard.jsx
 *
 * Muestra datos reales de Binance Futures obtenidos a través del backend.
 * Si el usuario no tiene keys configuradas → <NoKeysState />
 * Si las keys son inválidas → <InvalidKeysState error={msg} />
 * Si hay datos → dashboard completo con métricas reales.
 */
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import MetricGrid, { MetricRow } from '@/components/ui/MetricGrid'
import LoadingState from '@/components/ui/LoadingState'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import PeriodSelector from '@/components/dashboard/PeriodSelector'
import AIExecutiveSummary from '@/components/dashboard/AIExecutiveSummary'
import { fmtUsd, fmtLarge } from '@/lib/utils/format'
import { usePeriod } from '@/lib/PeriodContext'
import { useFearGreed, useBtcDominance } from '@/lib/hooks/useMarketData'
import {
  useBinanceAccount,
  useBinancePositions,
  useBinanceIncome,
} from '@/lib/hooks/useBinanceData'

// ── Helpers de estadísticas ───────────────────────────────────────────────────

function calcStats(dailyData) {
  if (!dailyData?.length) return null

  const profits   = dailyData.filter((d) => d.pnl >  0.5)
  const losses    = dailyData.filter((d) => d.pnl < -0.5)
  const breakeven = dailyData.filter((d) => Math.abs(d.pnl) <= 0.5)

  const totalProfit = profits.reduce((s, d) => s + d.pnl, 0)
  const totalLoss   = Math.abs(losses.reduce((s, d) => s + d.pnl, 0))
  const netPnl      = dailyData.reduce((s, d) => s + d.pnl, 0)
  const winRate     = dailyData.length ? (profits.length / dailyData.length) * 100 : 0
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99 : 0
  const avgProfit    = profits.length ? totalProfit / profits.length : 0
  const avgLoss      = losses.length  ? totalLoss  / losses.length  : 0
  const plRatio      = avgLoss > 0 ? avgProfit / avgLoss : 0

  const mean     = netPnl / dailyData.length
  const variance = dailyData.reduce((s, d) => s + (d.pnl - mean) ** 2, 0) / dailyData.length
  const stdDev   = Math.sqrt(variance)
  const sharpe   = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0

  let maxWin = 0, maxLose = 0, curWin = 0, curLose = 0
  let peak = 0, cum = 0, maxDD = 0
  for (const d of dailyData) {
    if      (d.pnl >  0.5) { curWin++;  curLose = 0; maxWin  = Math.max(maxWin,  curWin)  }
    else if (d.pnl < -0.5) { curLose++; curWin  = 0; maxLose = Math.max(maxLose, curLose) }
    else                   { curWin = 0; curLose = 0 }
    cum  += d.pnl
    peak  = Math.max(peak, cum)
    maxDD = Math.min(maxDD, cum - peak)
  }

  const sorted = [...dailyData].sort((a, b) => b.pnl - a.pnl)

  return {
    netPnl, totalProfit, totalLoss, winRate, profitFactor, plRatio,
    winningDays:  profits.length,
    losingDays:   losses.length,
    breakevenDays:breakeven.length,
    avgProfit, avgLoss, streakWin: maxWin, streakLose: maxLose,
    sharpe, maxDrawdown: maxDD,
    bestDay:  sorted[0]?.pnl || 0,
    worstDay: sorted[sorted.length - 1]?.pnl || 0,
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { filterByPeriod, activePeriod } = usePeriod()
  const { data: fgData  } = useFearGreed()
  const { data: glbData } = useBtcDominance()

  const account   = useBinanceAccount()
  const positions = useBinancePositions()
  const income    = useBinanceIncome(90)

  const noKeys   = account.error?.response?.data?.error === 'no_keys'
  const keyError = !noKeys && account.error
    ? account.error.response?.data?.message || account.error.message
    : null

  const isLoading = account.isLoading || income.isLoading

  // Filtrar datos de income por período seleccionado
  const allDailyData   = income.data?.byDay || []
  const filteredDaily  = useMemo(
    () => filterByPeriod(allDailyData, 'date'),
    [allDailyData, activePeriod]
  )
  const stats = useMemo(() => calcStats(filteredDaily), [filteredDaily])
  const totals = income.data?.totals || { realizedPnl: 0, fundingFee: 0, commission: 0 }

  // ── Estados condicionales ────────────────────────────────────────────────────
  if (noKeys)   return <NoKeysState />
  if (keyError) return <InvalidKeysState message={keyError} />
  if (isLoading) return <LoadingState message="conectando con Binance Futures" />

  const acct = account.data || {}
  const openPos = positions.data || []
  const floatingPnl = acct.totalUnrealizedProfit || 0
  const walletBalance = acct.totalWalletBalance || 0
  const marginBalance = acct.totalMarginBalance || 0

  const netPnlPeriod = stats?.netPnl ?? 0

  return (
    <div className="space-y-6">

      {/* Header + selector de período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-mono font-medium text-foreground">Portfolio Overview</h2>
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mt-0.5">
            {filteredDaily.length} días ·{' '}
            {filteredDaily[0]?.date || ''} → {filteredDaily[filteredDaily.length - 1]?.date || ''}
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          eyebrow="Wallet Balance"
          value={`$${walletBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          badge={`Margen: $${marginBalance.toLocaleString('en', { maximumFractionDigits: 2 })}`}
          badgeType="neutral"
        />
        <StatCard
          eyebrow="Net PNL (período)"
          value={fmtUsd(netPnlPeriod)}
          badge={`${filteredDaily.length}d · Realizado + Funding`}
          badgeType={netPnlPeriod >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          eyebrow="Floating PNL"
          value={fmtUsd(floatingPnl)}
          badge={`${openPos.length} posición${openPos.length !== 1 ? 'es' : ''} abierta${openPos.length !== 1 ? 's' : ''}`}
          badgeType={floatingPnl >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          eyebrow="Profit Factor"
          value={stats ? `${stats.profitFactor.toFixed(2)}x` : '—'}
          badge={stats ? `Win Rate ${stats.winRate.toFixed(1)}%` : 'Sin datos'}
          badgeType={stats && stats.winRate >= 50 ? 'positive' : 'negative'}
        />
      </div>

      {/* Posiciones abiertas */}
      {openPos.length > 0 && (
        <>
          <SectionHeader title="Posiciones Abiertas" tag="LIVE" />
          <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {['Par', 'Lado', 'Tamaño', 'Precio entrada', 'Mark Price', 'Liq. Price', 'PNL', 'Apalancamiento'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openPos.map((pos) => (
                  <tr key={pos.symbol} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-mono font-semibold text-foreground">{pos.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                        pos.side === 'LONG'
                          ? 'bg-green/10 text-green'
                          : 'bg-red/10 text-red'
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground">
                      {Math.abs(pos.positionAmt).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground">
                      ${pos.entryPrice.toLocaleString('en', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground">
                      ${pos.markPrice.toLocaleString('en', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {pos.liquidationPrice > 0
                        ? `$${pos.liquidationPrice.toLocaleString('en', { maximumFractionDigits: 4 })}`
                        : '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-mono font-medium ${pos.unrealizedProfit >= 0 ? 'text-green' : 'text-red'}`}>
                      {fmtUsd(pos.unrealizedProfit)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {pos.leverage}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Performance summary */}
      {stats && (
        <>
          <SectionHeader title="Performance Summary" tag="P&L" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricGrid>
              <MetricRow label="PNL Realizado"   value={fmtUsd(totals.realizedPnl)} colorClass={totals.realizedPnl >= 0 ? 'text-green' : 'text-red'} />
              <MetricRow label="Funding Fees"     value={fmtUsd(totals.fundingFee)}  colorClass={totals.fundingFee  >= 0 ? 'text-green' : 'text-red'} />
              <MetricRow label="Comisiones"       value={fmtUsd(totals.commission)}  colorClass="text-red" />
              <MetricRow label="Net PNL (período)"value={fmtUsd(stats.netPnl)}       colorClass={stats.netPnl >= 0 ? 'text-green' : 'text-red'} />
              <MetricRow label="Win Rate"         value={`${stats.winRate.toFixed(2)}%`}          colorClass={stats.winRate >= 50 ? 'text-green' : 'text-red'} />
              <MetricRow label="Profit Factor"    value={`${stats.profitFactor.toFixed(2)}x`}     colorClass={stats.profitFactor >= 1 ? 'text-green' : 'text-red'} />
            </MetricGrid>
            <MetricGrid>
              <MetricRow label="Días Ganadores"   value={`${stats.winningDays}`}              colorClass="text-green" />
              <MetricRow label="Días Perdedores"  value={`${stats.losingDays}`}               colorClass="text-red" />
              <MetricRow label="Días Breakeven"   value={`${stats.breakevenDays}`} />
              <MetricRow label="Avg Profit / Día" value={`$${stats.avgProfit.toFixed(2)}`}    colorClass="text-green" />
              <MetricRow label="Avg Loss / Día"   value={`$${stats.avgLoss.toFixed(2)}`}      colorClass="text-red" />
              <MetricRow label="P/L Ratio"        value={stats.plRatio.toFixed(2)} />
            </MetricGrid>
          </div>
        </>
      )}

      {/* Gráficos PNL */}
      {filteredDaily.length > 0
        ? <DashboardCharts data={filteredDaily} />
        : (
          <div className="bg-card border border-border rounded-lg h-40 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground">
              Sin datos de PNL para el período seleccionado
            </span>
          </div>
        )
      }

      {/* AI Executive Summary */}
      {stats && (
        <AIExecutiveSummary
          stats={stats}
          fgValue={fgData?.value ?? null}
          btcDom={glbData?.btcDom ?? null}
          balance={walletBalance.toFixed(2)}
        />
      )}

      {/* Risk metrics */}
      {stats && (
        <>
          <SectionHeader title="Risk & Performance Metrics" tag="QUANT" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricGrid>
              <MetricRow label="Sharpe Ratio"  value={stats.sharpe.toFixed(2)}          colorClass={stats.sharpe >= 1 ? 'text-green' : 'text-red'} />
              <MetricRow label="Max Drawdown"  value={fmtUsd(stats.maxDrawdown)}        colorClass="text-red" />
              <MetricRow label="Best Day"      value={fmtUsd(stats.bestDay)}            colorClass="text-green" />
              <MetricRow label="Worst Day"     value={fmtUsd(stats.worstDay)}           colorClass="text-red" />
            </MetricGrid>
            <MetricGrid>
              <MetricRow label="Max Win Streak"  value={`${stats.streakWin} días`}  colorClass="text-green" />
              <MetricRow label="Max Lose Streak" value={`${stats.streakLose} días`} colorClass="text-red" />
              <MetricRow label="Avg Profit"      value={`$${stats.avgProfit.toFixed(2)}`} colorClass="text-green" />
              <MetricRow label="Avg Loss"        value={`$${stats.avgLoss.toFixed(2)}`}  colorClass="text-red" />
            </MetricGrid>
            <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-center">
              <WinRateDonut
                winRate={stats.winRate}
                winDays={stats.winningDays}
                lossDays={stats.losingDays}
                beDays={stats.breakevenDays}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function WinRateDonut({ winRate, winDays, lossDays, beDays }) {
  const total    = winDays + lossDays + beDays || 1
  const C        = 301.59
  const winDash  = (winDays / total) * C
  const lossDash = (lossDays / total) * C
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="48" fill="none" stroke="hsl(var(--accent))" strokeWidth="14" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="#22C55E" strokeWidth="14"
          strokeDasharray={`${winDash} ${C}`} strokeDashoffset="0" strokeLinecap="butt" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="#EF4444" strokeWidth="14"
          strokeDasharray={`${lossDash} ${C}`} strokeDashoffset={`${-winDash}`} strokeLinecap="butt" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-mono font-medium text-foreground">{winRate.toFixed(0)}%</span>
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Win Rate</span>
      </div>
    </div>
  )
}

function NoKeysState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-5xl font-mono text-muted-foreground/10">◈</div>
      <div>
        <div className="text-lg font-mono font-medium text-foreground mb-2">
          Conecta tu cuenta de Binance
        </div>
        <p className="text-xs font-mono text-muted-foreground max-w-sm leading-relaxed">
          Ingresa tus claves API de <strong>solo lectura</strong> de Binance Futures
          para ver tu portfolio completo. Glorbi nunca ejecuta órdenes.
        </p>
      </div>
      <Link
        to="/settings"
        className="px-5 py-2.5 bg-foreground text-background rounded-lg font-mono text-xs uppercase tracking-wider hover:bg-foreground/90 transition-colors"
      >
        Ir a Ajustes →
      </Link>
    </div>
  )
}

function InvalidKeysState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="text-5xl font-mono text-red/20">⚠</div>
      <div>
        <div className="text-lg font-mono font-medium text-foreground mb-2">
          Error al conectar con Binance
        </div>
        <p className="text-xs font-mono text-red/80 max-w-sm leading-relaxed mb-3">
          {message}
        </p>
        <p className="text-[11px] font-mono text-muted-foreground/50 max-w-sm">
          Verifica que tus claves tengan permisos de lectura y que sean de Binance Futures (no Spot).
        </p>
      </div>
      <Link
        to="/settings"
        className="px-5 py-2.5 border border-border rounded-lg font-mono text-xs uppercase tracking-wider hover:bg-secondary transition-colors text-foreground"
      >
        Actualizar API Keys →
      </Link>
    </div>
  )
}
