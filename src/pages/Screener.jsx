import React from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingState from "@/components/ui/LoadingState";
import { useScreenerData } from "@/lib/hooks/useScreenerData";
import { fmtLarge } from "@/lib/utils/format";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function Screener() {
  const { data: pairs, isLoading } = useScreenerData();

  if (isLoading) {
    return <LoadingState message="cargando datos del screener" />;
  }

  const totalLongLiqs = (pairs || []).reduce((s, p) => s + (p.long_liquidations_24h || 0), 0);
  const totalShortLiqs = (pairs || []).reduce((s, p) => s + (p.short_liquidations_24h || 0), 0);
  const totalOI = (pairs || []).reduce((s, p) => s + (p.open_interest || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Screener de Derivados" tag="COINGLASS" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
            Open Interest Total
          </div>
          <div className="text-2xl font-mono text-foreground tracking-tight">
            {fmtLarge(totalOI)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
            Liquidaciones Longs 24h
          </div>
          <div className="text-2xl font-mono text-red tracking-tight">
            {fmtLarge(totalLongLiqs)}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
            Liquidaciones Shorts 24h
          </div>
          <div className="text-2xl font-mono text-green tracking-tight">
            {fmtLarge(totalShortLiqs)}
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-4 py-3 text-left text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Par</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Precio</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Open Interest</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">OI Δ 24h</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Funding Rate</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Liq. Longs</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Liq. Shorts</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">L/S Ratio</th>
              <th className="px-4 py-3 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Vol 24h</th>
            </tr>
          </thead>
          <tbody>
            {(pairs || []).map((pair, i) => {
              const fr = pair.funding_rate || 0;
              const oiChg = pair.oi_change_24h || 0;
              const lsr = pair.long_short_ratio || 1;
              const price = pair.price || 0;

              return (
                <tr key={pair.symbol || i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-mono font-semibold text-foreground">
                      {pair.symbol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-foreground">
                    ${price < 1 ? price.toFixed(4) : price.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-foreground">
                    {fmtLarge(pair.open_interest)}
                  </td>
                  <td className={`px-4 py-3 text-right text-[11px] font-mono ${oiChg >= 0 ? "text-green" : "text-red"}`}>
                    <span className="inline-flex items-center gap-0.5">
                      {oiChg >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(oiChg).toFixed(2)}%
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-[11px] font-mono ${fr >= 0 ? "text-green" : "text-red"}`}>
                    {fr >= 0 ? "+" : ""}{(fr * 100).toFixed(4)}%
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-red">
                    {fmtLarge(pair.long_liquidations_24h)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-green">
                    {fmtLarge(pair.short_liquidations_24h)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <LongShortBar ratio={lsr} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">
                    {fmtLarge(pair.volume_24h)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
          title="Liquidaciones"
          accent="#EF4444"
          body="Cascadas de liquidaciones amplifican movimientos de precio. Muchas liquidaciones de longs → presión bajista adicional. Muchas de shorts → presión alcista."
        />
        <GuideCard
          title="Long/Short Ratio"
          accent="#EAB308"
          body="Ratio > 1 = más cuentas en long. Ratio < 1 = más cuentas en short. Extremos suelen ser indicadores contrarian — la mayoría suele estar equivocada."
        />
      </div>
    </div>
  );
}

function LongShortBar({ ratio }) {
  const longPct = Math.min(95, Math.max(5, (ratio / (ratio + 1)) * 100));
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-[10px] font-mono text-muted-foreground">{ratio.toFixed(2)}</span>
      <div className="w-16 h-2 rounded-full overflow-hidden bg-red/30 flex">
        <div className="h-full bg-green rounded-l-full" style={{ width: `${longPct}%` }} />
      </div>
    </div>
  );
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
  );
}