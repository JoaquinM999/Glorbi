/**
 * Screener.jsx
 *
 * Cambios respecto a la versión Base44/demo:
 *  - useScreenerData() (LLM inventando números) → useBinanceScreener() (datos reales)
 *  - long_short_ratio, liquidaciones: Binance API pública no las expone gratis,
 *    así que se muestran como "—" en vez de inventar valores.
 *  - El resto de la UI es idéntico.
 */
import React from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import LoadingState from '@/components/ui/LoadingState'
import { useBinanceScreener } from '@/lib/hooks/useBinanceData'
import { fmtLarge } from '@/lib/utils/format'
import { ArrowUp, ArrowDown } from 'lucide-react'

import StatCard from '@/components/ui/StatCard'
import ScrollReveal from '@/components/ui/ScrollReveal'
import { staggerContainer, staggerItemSubtle } from '@/lib/animations'
import { motion } from 'framer-motion'

export default function Screener() {
  const { data: pairs, isLoading, error } = useBinanceScreener()

  if (isLoading) {
    return <LoadingState message="cargando datos del screener" />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <span className="text-2xl text-red/30">⚠</span>
        <p className="text-xs font-mono text-muted-foreground max-w-sm">
          No se pudo conectar con la API de Binance. Intenta de nuevo en unos segundos.
        </p>
      </div>
    )
  }

  const totalOI = (pairs || []).reduce((s, p) => s + (p.open_interest || 0), 0)
  const avgFunding = (pairs || []).length
    ? (pairs || []).reduce((s, p) => s + (p.funding_rate || 0), 0) / pairs.length
    : 0

  return (
    <div className="space-y-6">
      <SectionHeader title="Screener de Derivados" tag="BINANCE FUTURES" />

      {/* Summary cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div variants={staggerItemSubtle} className="h-full">
          <StatCard
            eyebrow="Open Interest Total"
            value={fmtLarge(totalOI)}
          />
        </motion.div>
        <motion.div variants={staggerItemSubtle} className="h-full">
          <StatCard
            eyebrow="Funding Rate Promedio"
            value={`${avgFunding >= 0 ? '+' : ''}${(avgFunding * 100).toFixed(4)}%`}
            valueClass={avgFunding >= 0 ? 'text-green' : 'text-red'}
          />
        </motion.div>
        <motion.div variants={staggerItemSubtle} className="h-full">
          <StatCard
            eyebrow="Pares Monitoreados"
            value={(pairs || []).length}
          />
        </motion.div>
      </motion.div>

      {/* Main table */}
      <ScrollReveal delay={0.1}>
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-4 py-3 text-left text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Par</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Open Interest</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Cambio 24h</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Funding Rate</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Vol 24h</th>
            </tr>
          </thead>
          <tbody>
            {(pairs || []).map((pair) => {
              const fr = pair.funding_rate || 0
              const chg = pair.oi_change_24h || 0
              const price = pair.price || 0

              return (
                <tr key={pair.symbol} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-mono font-semibold text-foreground">
                      {pair.symbol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-foreground">
                    ${price < 1 ? price.toFixed(4) : price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] font-mono text-foreground">
                    ${fmtLarge(pair.open_interest)}
                  </td>
                  <td className={`px-4 py-3 text-right text-[11px] font-mono font-medium ${chg >= 0 ? 'text-green' : 'text-red'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {chg >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                      {Math.abs(chg).toFixed(2)}%
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right text-[11px] font-mono ${fr >= 0 ? 'text-green' : 'text-red'}`}>
                    {fr >= 0 ? '+' : ''}{(fr * 100).toFixed(4)}%
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">
                    {fmtLarge(pair.volume_24h)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </ScrollReveal>

      {(!pairs || pairs.length === 0) && !isLoading && (
        <p className="text-center text-muted-foreground font-mono text-sm py-10">
          — Sin datos disponibles —
        </p>
      )}

      {/* Reading guide */}
      <SectionHeader title="Guía de lectura" tag="EDUCACIÓN" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <GuideCard
          title="Funding Rate"
          accent="#22C55E"
          body="Tasa positiva → longs pagan a shorts (mercado alcista). Tasa negativa → shorts pagan a longs (mercado bajista). Rates extremas suelen preceder reversiones."
        />
        <GuideCard
          title="Open Interest"
          accent="#FFFFFF"
          body="OI creciente + precio creciente = momentum fuerte. OI cayendo + precio cayendo = cierre de posiciones. OI creciente + precio estable = acumulación de posiciones."
        />
        <GuideCard
          title="Cambio 24h"
          accent="#EAB308"
          body="Variación porcentual del precio en las últimas 24 horas, según el ticker de Binance Futures."
        />
        <GuideCard
          title="Volumen 24h"
          accent="#84CC16"
          body="Volumen total negociado (en USD) en las últimas 24 horas para el par. Alto volumen valida movimientos de precio."
        />
      </div>
    </div>
  )
}

function GuideCard({ title, accent, body }) {
  return (
    <div
      className="bg-secondary/50 border border-border rounded-lg p-5"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}
