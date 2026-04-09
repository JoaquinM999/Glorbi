/**
 * AIExecutiveSummary.jsx
 *
 * Changes from Base44 version:
 *  - import { base44 } → import { InvokeLLM } from @/api/integrations
 *  - base44.integrations.Core.InvokeLLM → InvokeLLM
 *  All UI logic is unchanged.
 */
import React, { useState } from 'react'
import { InvokeLLM } from '@/api/integrations'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, Terminal } from 'lucide-react'

const MOCK_ANALYSIS = `GLORBI QUANT ENGINE — ANÁLISIS EJECUTIVO
========================================
FECHA: ${new Date().toISOString().slice(0, 10)}
MODELO: InstitutionalQuantGPT v2

[SENTIMIENTO DE MERCADO]
Fear & Greed Index: 13 — MIEDO EXTREMO
→ Históricamente, lecturas <20 han precedido rebotes técnicos en 67% de
  los casos en ventana de 7-14 días. Acumulación institucional detectada.

[DOMINANCIA BTC]
BTC Dom: 58.4% — Fase de "Bitcoin Season"
→ Alta dominancia sugiere rotación defensiva hacia BTC. Altcoins bajo
  presión relativa. Evitar exposición alt-heavy hasta que Dom < 52%.

[PORTFOLIO PNL]
Net PNL: -$1,240.50 (período seleccionado)
→ Drawdown dentro de límites tolerables. Profit Factor > 1.0 indica
  sistema consistente a pesar del P&L negativo puntual.

[RECOMENDACIONES CUANTITATIVAS]
1. REDUCIR exposición total 15-20% dado F&G < 20
2. MANTENER stops actuales — no ampliar riesgo en clima de pánico
3. VIGILAR dominancia: si cae bajo 55%, considerar rotación hacia ETH
4. OPORTUNIDAD: compras escaladas en zonas de Miedo Extremo históricas

[RIESGO]
Sharpe < 1.0 en período corto. Normal en mercado lateral.
Max Drawdown controlado. Sin señales de over-trading.

— ANÁLISIS GENERADO POR IA. NO ES ASESORÍA FINANCIERA —`

export default function AIExecutiveSummary({ stats, fgValue, btcDom, balance }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [usedMock, setUsedMock] = useState(false)

  const generate = async () => {
    setLoading(true)
    setAnalysis(null)
    try {
      const context = `
        Fear & Greed Index: ${fgValue ?? 'N/A'}
        BTC Dominance: ${btcDom ?? 'N/A'}%
        Net PNL: $${stats?.netPnl?.toFixed(2) ?? 'N/A'}
        Win Rate: ${stats?.winRate?.toFixed(1) ?? 'N/A'}%
        Profit Factor: ${stats?.profitFactor?.toFixed(2) ?? 'N/A'}x
        Sharpe Ratio: ${stats?.sharpe?.toFixed(2) ?? 'N/A'}
        Max Drawdown: $${stats?.maxDrawdown?.toFixed(2) ?? 'N/A'}
        Balance estimado: $${balance ?? '25,430.50'}
      `

      const result = await InvokeLLM({
        prompt: `Actúa como un analista cuantitativo institucional de crypto.
        Analiza los siguientes datos de mercado y portfolio:
        ${context}

        Genera un análisis ejecutivo conciso en formato terminal/texto plano con:
        1. Interpretación del Fear & Greed y qué implica para el mercado
        2. Implicaciones de la dominancia de BTC
        3. Evaluación del performance del portfolio
        4. 3-4 recomendaciones cuantitativas concretas y accionables
        5. Evaluación de riesgo

        Usa formato de terminal con secciones en MAYÚSCULAS, separadores con "=" y "→" para puntos clave.
        Sé directo, técnico y conciso. Máximo 40 líneas. Sin disclaimers largos.`,
      })

      setAnalysis(typeof result === 'string' ? result : JSON.stringify(result))
      setUsedMock(false)
    } catch (err) {
      setAnalysis(MOCK_ANALYSIS)
      setUsedMock(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-[2px]">
            AI Executive Summary
          </span>
          {usedMock && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-yellow/30 bg-yellow/5 text-yellow uppercase tracking-wider">
              demo
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono border border-border hover:border-foreground/30 hover:bg-foreground/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {loading ? 'Analizando...' : 'Generar Análisis'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!analysis && !loading && (
          <div className="h-28 flex items-center justify-center border border-dashed border-border rounded-lg">
            <span className="text-[11px] font-mono text-muted-foreground/40">
              Presiona "Generar Análisis" para obtener un resumen IA de tu portfolio
            </span>
          </div>
        )}

        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-28 flex flex-col items-center justify-center gap-3"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[2px]">
              Procesando datos del portfolio...
            </span>
          </motion.div>
        )}

        {analysis && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none rounded-t-lg" />
            <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap bg-background/60 rounded-lg p-4 border border-border max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1">
              {analysis}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}