/**
 * MarketPulse.jsx
 *
 * Se agregó animación de entrada escalonada sutil a la fila superior de
 * cards (mismo tratamiento que Dashboard.jsx), ya que StatCard dejó de
 * traer su propia animación — ahora el control vive en el componente
 * padre para poder coordinar el efecto stagger entre varias cards.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItemSubtle } from "@/lib/animations";
import StatCard from "@/components/ui/StatCard";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingState from "@/components/ui/LoadingState";
import ScrollReveal from "@/components/ui/ScrollReveal";
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

import MacroKPIBar from "@/components/pulse/local/MacroKPIBar";
import TopMovers from "@/components/pulse/local/TopMovers";
import MervalTable from "@/components/pulse/local/MervalTable";
import CedearsTable from "@/components/pulse/local/CedearsTable";
import BondTable from "@/components/pulse/local/BondTable";

export default function MarketPulse() {
  const [activeTab, setActiveTab] = useState('cripto');

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
  const altDom = Math.max(0, 100 - (glbData.btcDom || 0) - (glbData.ethDom || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SectionHeader title="Market Pulse — Sentimiento del Mercado" tag="PULSE" />
        <div className="flex bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('cripto')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'cripto' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Cripto
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${activeTab === 'local' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Mercado Local
          </button>
        </div>
      </div>

      {activeTab === 'cripto' ? (
        <>
          {/* Top row: F&G + Dominance + MCap + Volume + Altcoin Dominance */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <motion.div variants={staggerItemSubtle} className="h-full">
              {fgData ? (
                <FearGreedGauge value={fgData.value} />
              ) : (
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center h-full text-center text-muted-foreground font-mono text-sm">N/A</div>
              )}
            </motion.div>
            <motion.div variants={staggerItemSubtle} className="h-full">
              <StatCard
                eyebrow="BTC Dominance"
                value={`${glbData.btcDom || 0}%`}
                badge={`ETH ${glbData.ethDom || 0}%`}
                badgeType="neutral"
              />
            </motion.div>
            <motion.div variants={staggerItemSubtle} className="h-full">
              <StatCard
                eyebrow="Total Market Cap"
                value={fmtLarge(glbData.totalMcap)}
                badge={`${glbData.mcapChange24h >= 0 ? "▲" : "▼"} ${Math.abs(glbData.mcapChange24h || 0)}% 24h`}
                badgeType={glbData.mcapChange24h >= 0 ? "positive" : "negative"}
              />
            </motion.div>
            <motion.div variants={staggerItemSubtle} className="h-full">
              <StatCard
                eyebrow="Volumen 24h"
                value={fmtLarge(glbData.totalVol)}
                badge={`${(glbData.activeCryptos || 0).toLocaleString()} activos`}
                badgeType="neutral"
              />
            </motion.div>
            <motion.div variants={staggerItemSubtle} className="h-full">
              <StatCard
                eyebrow="Dominancia Altcoins"
                value={`${altDom.toFixed(1)}%`}
                badge={altDom >= 45 ? "Altseason posible" : "BTC/ETH dominan"}
                badgeType={altDom >= 45 ? "positive" : "neutral"}
              />
            </motion.div>
          </motion.div>

          {/* BTC Price Chart */}
          <ScrollReveal>
            <SectionHeader title="Bitcoin — precio 30 días" tag="BTC" />
            <BtcPriceChart data={btcHist.data || []} isLoading={btcHist.isLoading} />
          </ScrollReveal>

          {/* F&G History */}
          <ScrollReveal delay={0.1}>
            <SectionHeader title="Fear & Greed — últimos 30 días" tag="HISTÓRICO" />
            <FearGreedHistory data={fgData?.history || []} isLoading={fg.isLoading} />
          </ScrollReveal>

          {/* Top 10 + Trending */}
          <ScrollReveal delay={0.15}>
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
          </ScrollReveal>

          {/* Reading guide — collapsible */}
          <MarketReadingGuide />
        </>
      ) : (
        <div className="space-y-6">
          <MacroKPIBar />
          
          <ScrollReveal delay={0.05}>
            <TopMovers />
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <SectionHeader title="Merval" tag="ACCIONES" />
                <MervalTable />
              </div>
              <div>
                <SectionHeader title="Cedears" tag="EXTERIOR" />
                <CedearsTable />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <SectionHeader title="Bonos Públicos" tag="SOBERANOS" />
            <BondTable />
          </ScrollReveal>
        </div>
      )}
    </div>
  );
}
