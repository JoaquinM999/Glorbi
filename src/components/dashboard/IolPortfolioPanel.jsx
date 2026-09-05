import React, { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import SectionHeader from '@/components/ui/SectionHeader'
import MetricGrid, { MetricRow } from '@/components/ui/MetricGrid'
import LoadingState from '@/components/ui/LoadingState'
import { useIolHistory, useIolPerformance, useIolPortfolio } from '@/lib/hooks/useIolData'
import { useNewsData } from '@/lib/hooks/useNewsData'
import apiClient from '@/api/apiClient'
import { fmtPct } from '@/lib/utils/format'
import NewsCard from '@/components/news/NewsCard'

function ars(value) {
  return `$${Number(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function IolPortfolioPanel() {
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState('1M')
  const [assetFilter, setAssetFilter] = useState('ALL')
  const queryClient = useQueryClient()
  const portfolio = useIolPortfolio()
  const history = useIolHistory(page)
  const performance = useIolPerformance(period)
  const { data: news = [] } = useNewsData()
  const syncMutation = useMutation({
    mutationFn: () => apiClient.post('/api/iol/sync'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iol'] })
      toast.success('IOL sincronizado correctamente')
    },
    onError: (error) => toast.error(error.response?.data?.message || 'No se pudo sincronizar IOL'),
  })

  if (portfolio.isLoading) return <LoadingState message="conectando con IOL" />
  if (portfolio.error) {
    const notConfigured = portfolio.error.response?.data?.error === 'iol_not_configured'
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <SectionHeader title="Inversiones IOL" tag="SOLO LECTURA" />
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          {notConfigured ? 'Configura tu usuario y contraseña IOL desde Ajustes para conectar esta cuenta.' : 'No fue posible consultar IOL en este momento.'}
        </p>
      </div>
    )
  }

  const positions = portfolio.data?.positions || []
  const filteredPositions = assetFilter === 'ALL' ? positions : positions.filter((position) => position.assetType.toUpperCase().includes(assetFilter))
  const hasPrevious = page > 1
  const hasNext = page < (history.data?.pages || 1)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Inversiones IOL" tag="SOLO LECTURA" />
        <button type="button" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} /> Sincronizar
        </button>
      </div>

      <MetricGrid>
        <MetricRow label="Valuación total" value={ars(portfolio.data?.totalBalance)} />
        <MetricRow label="Liquidez disponible" value={ars(portfolio.data?.cashBalance)} />
        <MetricRow label="Capital invertido" value={ars(portfolio.data?.investedBalance)} />
        <MetricRow label="Resultado no realizado" value={ars(positions.reduce((sum, position) => sum + position.profitLoss, 0))} colorClass={positions.reduce((sum, position) => sum + position.profitLoss, 0) >= 0 ? 'text-green' : 'text-red'} />
      </MetricGrid>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Evolución del patrimonio</span>
          <div className="flex gap-1">
            {['1D', '1W', '1M', '1Y', 'ALL'].map((option) => (
              <button key={option} type="button" onClick={() => setPeriod(option)} className={`px-2 py-1 text-[9px] font-mono rounded border ${period === option ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
        {performance.isLoading ? <div className="h-48 flex items-center justify-center text-xs font-mono text-muted-foreground">Cargando historial...</div> : performance.data?.series?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={performance.data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs><linearGradient id="iolBalance" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22C55E" stopOpacity={0.2} /><stop offset="100%" stopColor="#22C55E" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontFamily: 'IBM Plex Mono' }} tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [ars(value), 'Patrimonio']} labelFormatter={(label) => label} />
              <Area type="monotone" dataKey="total_balance" stroke="#22C55E" fill="url(#iolBalance)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="h-48 flex items-center justify-center text-xs font-mono text-muted-foreground">Sin snapshots. Pulsa Sincronizar para guardar el primero.</div>}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <span className="mr-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Activos</span>
          {[['ALL', 'Todos'], ['ACCIONES', 'Acciones'], ['BONOS', 'Bonos'], ['CEDEAR', 'CEDEARs'], ['FCI', 'FCI']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setAssetFilter(value)} className={`rounded border px-2 py-1 text-[9px] font-mono uppercase tracking-wider ${assetFilter === value ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">{filteredPositions.length} / {positions.length}</span>
        </div>
        <table className="w-full min-w-[720px]">
          <thead><tr className="bg-secondary border-b border-border">{['Activo', 'Cantidad', 'Último precio', 'Valuación', 'Día', 'Resultado'].map((label) => <th key={label} className="px-4 py-3 text-left text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</th>)}</tr></thead>
          <tbody>
            {filteredPositions.length ? filteredPositions.map((position) => (
              <tr key={position.ticker} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-4 py-3"><div className="text-xs font-mono font-semibold text-foreground">{position.ticker}</div><div className="text-[10px] text-muted-foreground">{position.description}</div><div className="mt-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">{position.assetType} · {position.currency} · {position.market}</div></td>
                <td className="px-4 py-3 text-xs font-mono">{position.quantity}</td>
                <td className="px-4 py-3 text-xs font-mono">{ars(position.lastPrice)}</td>
                <td className="px-4 py-3 text-xs font-mono">{ars(position.totalValue)}</td>
                <td className={`px-4 py-3 text-xs font-mono ${position.dailyChange >= 0 ? 'text-green' : 'text-red'}`}>{fmtPct(position.dailyChange)}</td>
                <td className={`px-4 py-3 text-xs font-mono ${position.profitLoss >= 0 ? 'text-green' : 'text-red'}`}>{ars(position.profitLoss)}</td>
              </tr>
            )) : <tr><td colSpan="6" className="px-4 py-6 text-center text-xs font-mono text-muted-foreground">No hay activos en este filtro.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Noticias relacionadas con tu cartera</span>
          <a href="/news" className="text-[10px] font-mono text-muted-foreground hover:text-foreground">Ver radar</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredPositions.flatMap((position) => news.filter((article) => article.title?.toLowerCase().includes(position.ticker.toLowerCase())).slice(0, 2)).slice(0, 6).map((article, index) => (
            <NewsCard key={`${article.link}-${index}`} {...article} />
          ))}
          {!filteredPositions.some((position) => news.some((article) => article.title?.toLowerCase().includes(position.ticker.toLowerCase()))) && <p className="text-xs font-mono text-muted-foreground">Todavía no hay noticias que mencionen tus activos.</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border"><span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Operaciones recientes</span><span className="text-[10px] font-mono text-muted-foreground">{history.data?.total || 0} total</span></div>
        <table className="w-full min-w-[620px]">
          <thead><tr className="bg-secondary border-b border-border">{['Fecha', 'Tipo', 'Activo', 'Cantidad', 'Precio', 'Total'].map((label) => <th key={label} className="px-4 py-3 text-left text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</th>)}</tr></thead>
          <tbody>{(history.data?.items || []).map((operation) => <tr key={operation.operation_id} className="border-b border-border/50"><td className="px-4 py-3 text-xs font-mono">{String(operation.date).slice(0, 10)}</td><td className="px-4 py-3 text-xs font-mono"><span className={/venta|sell/i.test(operation.type) ? 'text-red' : 'text-green'}>{operation.type}</span></td><td className="px-4 py-3 text-xs font-mono">{operation.ticker}</td><td className="px-4 py-3 text-xs font-mono">{operation.quantity}</td><td className="px-4 py-3 text-xs font-mono">{ars(operation.price)}</td><td className="px-4 py-3 text-xs font-mono">{ars(operation.total_amount)}</td></tr>)}</tbody>
        </table>
        <div className="flex items-center justify-end gap-2 px-4 py-3"><button type="button" aria-label="Página anterior" disabled={!hasPrevious} onClick={() => setPage((current) => current - 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><span className="text-[10px] font-mono text-muted-foreground">{page} / {history.data?.pages || 1}</span><button type="button" aria-label="Página siguiente" disabled={!hasNext} onClick={() => setPage((current) => current + 1)} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div>
      </div>
    </section>
  )
}
