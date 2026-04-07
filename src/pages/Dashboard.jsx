import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/ui/StatCard";
import SectionHeader from "@/components/ui/SectionHeader";
import MetricGrid, { MetricRow } from "@/components/ui/MetricGrid";
import LoadingState from "@/components/ui/LoadingState";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import AIExecutiveSummary from "@/components/dashboard/AIExecutiveSummary";
import { fmtUsd } from "@/lib/utils/format";
import { usePeriod } from "@/lib/PeriodContext";
import { useFearGreed, useBtcDominance } from "@/lib/hooks/useMarketData";

// Generate deterministic demo daily PNL data (60 days)
function buildDemoData() {
  const days = 60;
  const data = [];
  const now = new Date();
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const pnl = Math.round(((rand() - 0.38) * 520) * 100) / 100;
    data.push({ date: date.toISOString().slice(0, 10), pnl });
  }
  return data;
}

const ALL_DEMO_DATA = buildDemoData();

function calcStats(data) {
  if (!data.length) return null;
  const profits = data.filter(d => d.pnl > 0.5);
  const losses  = data.filter(d => d.pnl < -0.5);
  const breakeven = data.filter(d => Math.abs(d.pnl) <= 0.5);
  const totalProfit = profits.reduce((s, d) => s + d.pnl, 0);
  const totalLoss   = Math.abs(losses.reduce((s, d) => s + d.pnl, 0));
  const netPnl      = data.reduce((s, d) => s + d.pnl, 0);
  const winRate     = data.length > 0 ? (profits.length / data.length) * 100 : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99 : 0;
  const plRatio     = losses.length > 0
    ? (totalProfit / profits.length || 0) / (totalLoss / losses.length || 1)
    : 0;
  const avgProfit = profits.length > 0 ? totalProfit / profits.length : 0;
  const avgLoss   = losses.length  > 0 ? totalLoss  / losses.length  : 0;

  // Sharpe (simplified daily)
  const mean = netPnl / data.length;
  const variance = data.reduce((s, d) => s + Math.pow(d.pnl - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

  // Streaks
  let maxWin = 0, maxLose = 0, curWin = 0, curLose = 0;
  for (const d of data) {
    if (d.pnl > 0.5) { curWin++; curLose = 0; maxWin = Math.max(maxWin, curWin); }
    else if (d.pnl < -0.5) { curLose++; curWin = 0; maxLose = Math.max(maxLose, curLose); }
    else { curWin = 0; curLose = 0; }
  }

  // Drawdown
  let peak = 0, cum = 0, maxDD = 0;
  for (const d of data) { cum += d.pnl; peak = Math.max(peak, cum); maxDD = Math.min(maxDD, cum - peak); }

  const sorted = [...data].sort((a, b) => b.pnl - a.pnl);

  return {
    totalProfit, totalLoss, netPnl, winRate, profitFactor,
    plRatio, winningDays: profits.length, losingDays: losses.length,
    breakevenDays: breakeven.length, avgProfit, avgLoss,
    streakWin: maxWin, streakLose: maxLose, sharpe,
    maxDrawdown: maxDD,
    bestDay:  sorted[0]?.pnl  || 0,
    worstDay: sorted[sorted.length - 1]?.pnl || 0,
  };
}

export default function Dashboard() {
  const { filterByPeriod, activePeriod } = usePeriod();
  const { data: fgData } = useFearGreed();
  const { data: glbData } = useBtcDominance();

  const { data: settings } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const me = await base44.auth.me();
      const items = await base44.entities.UserSettings.filter({ created_by: me.email });
      return items[0] || null;
    },
  });

  const hasKeys = settings?.binance_api_key && settings?.binance_api_secret;

  // Filter demo data to the active period
  const filteredData = useMemo(() => filterByPeriod(ALL_DEMO_DATA, "date"), [activePeriod]);
  const stats = useMemo(() => calcStats(filteredData), [filteredData]);

  if (!hasKeys) return <NoKeysState />;
  if (!stats) return <LoadingState message="calculando métricas" />;

  return (
    <div className="space-y-6">
      {/* Period selector header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-mono font-medium text-foreground">Portfolio Overview</h2>
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mt-0.5">
            {filteredData.length} días · {filteredData[0]?.date || ""} → {filteredData[filteredData.length - 1]?.date || ""}
          </p>
        </div>
        <PeriodSelector />
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          eyebrow="Net Worth"
          value="$25,430.50"
          badge="Margin Balance"
          badgeType="neutral"
        />
        <StatCard
          eyebrow="Net PNL"
          value={fmtUsd(stats.netPnl)}
          badge={`${filteredData.length}d · PNL + Funding`}
          badgeType={stats.netPnl >= 0 ? "positive" : "negative"}
        />
        <StatCard
          eyebrow="Floating PNL"
          value={fmtUsd(345.20)}
          badge="▲ En posiciones abiertas"
          badgeType="positive"
        />
        <StatCard
          eyebrow="Profit Factor"
          value={`${stats.profitFactor.toFixed(2)}x`}
          badge={`Win Rate ${stats.winRate.toFixed(1)}%`}
          badgeType={stats.winRate >= 50 ? "positive" : "negative"}
        />
      </div>

      {/* Performance Summary */}
      <SectionHeader title="Performance Summary" tag="P&L" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricGrid>
          <MetricRow label="Total Profit" value={`$${stats.totalProfit.toLocaleString("en", {minimumFractionDigits:2,maximumFractionDigits:2})}`} colorClass="text-green" />
          <MetricRow label="Total Loss"   value={`$${stats.totalLoss.toLocaleString("en",   {minimumFractionDigits:2,maximumFractionDigits:2})}`} colorClass="text-red" />
          <MetricRow label="Net PNL"      value={fmtUsd(stats.netPnl)} colorClass={stats.netPnl >= 0 ? "text-green" : "text-red"} />
          <MetricRow label="Win Rate"     value={`${stats.winRate.toFixed(2)}%`} colorClass={stats.winRate >= 50 ? "text-green" : "text-red"} />
          <MetricRow label="Profit Factor" value={`${stats.profitFactor.toFixed(2)}x`} colorClass={stats.profitFactor >= 1 ? "text-green" : "text-red"} />
          <MetricRow label="P/L Ratio"    value={stats.plRatio.toFixed(2)} />
        </MetricGrid>
        <MetricGrid>
          <MetricRow label="Días Ganadores"  value={`${stats.winningDays}`}  colorClass="text-green" />
          <MetricRow label="Días Perdedores" value={`${stats.losingDays}`}   colorClass="text-red" />
          <MetricRow label="Días Breakeven"  value={`${stats.breakevenDays}`} />
          <MetricRow label="Avg Profit / Día" value={`$${stats.avgProfit.toFixed(2)}`}  colorClass="text-green" />
          <MetricRow label="Avg Loss / Día"   value={`$${stats.avgLoss.toFixed(2)}`}    colorClass="text-red" />
          <MetricRow label="Max Streak Win"   value={`${stats.streakWin} días`}         colorClass="text-green" />
        </MetricGrid>
      </div>

      {/* Charts — pass filtered data */}
      <DashboardCharts data={filteredData} />

      {/* AI Executive Summary */}
      <AIExecutiveSummary
        stats={stats}
        fgValue={fgData?.value ?? null}
        btcDom={glbData?.btcDom ?? null}
        balance="25,430.50"
      />

      {/* Risk Metrics */}
      <SectionHeader title="Risk & Performance Metrics" tag="QUANT" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricGrid>
          <MetricRow label="Sharpe Ratio"  value={stats.sharpe.toFixed(2)}  colorClass={stats.sharpe >= 1 ? "text-green" : "text-red"} />
          <MetricRow label="Max Drawdown"  value={fmtUsd(stats.maxDrawdown)} colorClass="text-red" />
          <MetricRow label="Best Day"      value={fmtUsd(stats.bestDay)}     colorClass="text-green" />
          <MetricRow label="Worst Day"     value={fmtUsd(stats.worstDay)}    colorClass="text-red" />
        </MetricGrid>
        <MetricGrid>
          <MetricRow label="Max Win Streak"  value={`${stats.streakWin} días`}  colorClass="text-green" />
          <MetricRow label="Max Lose Streak" value={`${stats.streakLose} días`} colorClass="text-red" />
          <MetricRow label="Avg Profit"      value={`$${stats.avgProfit.toFixed(2)}`} colorClass="text-green" />
          <MetricRow label="Avg Loss"        value={`$${stats.avgLoss.toFixed(2)}`}   colorClass="text-red" />
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
    </div>
  );
}

function WinRateDonut({ winRate, winDays, lossDays, beDays }) {
  const total = winDays + lossDays + beDays || 1;
  const C = 301.59; // 2π × 48
  const winDash  = (winDays  / total) * C;
  const lossDash = (lossDays / total) * C;

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
  );
}

function NoKeysState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="text-4xl font-mono text-muted-foreground/20">◈</div>
      <div className="text-lg font-mono text-foreground">Conecta tu cuenta</div>
      <div className="text-xs font-mono text-muted-foreground max-w-sm leading-relaxed tracking-wide">
        Ve a <strong>Ajustes</strong> e ingresa tus claves API de Binance Futures
        <br />para acceder al dashboard completo.
      </div>
    </div>
  );
}