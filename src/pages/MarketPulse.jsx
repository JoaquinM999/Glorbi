import React from "react";
import StatCard from "@/components/ui/StatCard";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingState from "@/components/ui/LoadingState";
import FearGreedGauge from "@/components/pulse/FearGreedGauge";
import MarketReadingGuide from "@/components/pulse/MarketReadingGuide";
import BtcPriceChart from "@/components/pulse/BtcPriceChart";
import FearGreedHistory from "@/components/pulse/FearGreedHistory";
import TopCoinsTable from "@/components/pulse/TopCoinsTable";
import TrendingCoins from "@/components/pulse/TrendingCoins";
import { fmtLarge, fmtPct } from "@/lib/utils/format";
import {
  useFearGreed,
  useBtcDominance,
  useTopCoins,
  useTrendingCoins,
  useBtcHistory,
} from "@/lib/hooks/useMarketData";

export default function MarketPulse() {
  const fg = useFearGreed();
  const glb = useBtcDominance();
  const top10 = useTopCoins();
  const trending = useTrendingCoins();
  const btcHist = useBtcHistory(30);

  const isLoading = fg.isLoading || glb.isLoading;

  if (isLoading) {
    return <LoadingState message="cargando pulso del mercado" />;
  }

  const fgData = fg.data;
  const glbData = glb.data || {};

  return (
    <div className="space-y-6">
      <SectionHeader title="Market Pulse — Sentimiento del Mercado" tag="PULSE" />

      {/* Top row: F&G + Dominance + MCap + Volume */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          {fgData ? (
            <FearGreedGauge value={fgData.value} />
          ) : (
            <div className="text-center text-muted-foreground font-mono text-sm">N/A</div>
          )}
        </div>
        <StatCard
          eyebrow="BTC Dominance"
          value={`${glbData.btcDom || 0}%`}
          badge={`ETH ${glbData.ethDom || 0}%`}
          badgeType="neutral"
        />
        <StatCard
          eyebrow="Total Market Cap"
          value={fmtLarge(glbData.totalMcap)}
          badge={`${glbData.mcapChange24h >= 0 ? "▲" : "▼"} ${Math.abs(glbData.mcapChange24h || 0)}% 24h`}
          badgeType={glbData.mcapChange24h >= 0 ? "positive" : "negative"}
        />
        <StatCard
          eyebrow="Volumen 24h"
          value={fmtLarge(glbData.totalVol)}
          badge={`${(glbData.activeCryptos || 0).toLocaleString()} activos`}
          badgeType="neutral"
        />
      </div>

      {/* BTC Price Chart */}
      <SectionHeader title="Bitcoin — precio 30 días" tag="BTC" />
      <BtcPriceChart data={btcHist.data || []} isLoading={btcHist.isLoading} />

      {/* F&G History */}
      <SectionHeader title="Fear & Greed — últimos 30 días" tag="HISTÓRICO" />
      <FearGreedHistory data={fgData?.history || []} isLoading={fg.isLoading} />

      {/* Top 10 + Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <SectionHeader title="Top 10 por Market Cap" tag="COINS" />
          <TopCoinsTable coins={top10.data || []} isLoading={top10.isLoading} />
        </div>
        <div className="lg:col-span-2">
          <SectionHeader title="Trending ahora" tag="BÚSQUEDAS" />
          <TrendingCoins coins={trending.data || []} isLoading={trending.isLoading} />
        </div>
      </div>

      {/* Reading guide — collapsible */}
      <MarketReadingGuide />
    </div>
  );
}