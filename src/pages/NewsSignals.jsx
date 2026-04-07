import React, { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingState from "@/components/ui/LoadingState";
import NewsCard from "@/components/news/NewsCard";
import SignalDirectory from "@/components/news/SignalDirectory";
import { useNewsData, useSignalFeeds } from "@/lib/hooks/useNewsData";
import { CAT_LABELS } from "@/lib/utils/news-classifier";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CAT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "market", label: "Mercado Crypto" },
  { value: "defi", label: "DeFi" },
  { value: "protocol", label: "Protocolo" },
  { value: "fed", label: "Fed / Powell" },
  { value: "whitehouse", label: "Casa Blanca" },
  { value: "macro", label: "Macro / Índices" },
  { value: "geopolitical", label: "Geopolítica" },
];

export default function NewsSignals() {
  const [catFilter, setCatFilter] = useState("all");
  const { data: news, isLoading: newsLoading } = useNewsData();
  const { data: signals, isLoading: signalsLoading } = useSignalFeeds();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="news" className="w-full">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="news" className="font-mono text-xs uppercase tracking-wider">
            Radar de Mercado
          </TabsTrigger>
          <TabsTrigger value="signals" className="font-mono text-xs uppercase tracking-wider">
            Signal Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-6">
          <SectionHeader title="Market Intelligence Radar" tag="NOTICIAS" />

          {/* Category filter */}
          <div className="flex items-center gap-4 mb-6">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-48 bg-card border-border font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {CAT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {newsLoading ? (
            <LoadingState message="cargando noticias" />
          ) : (
            <>
              {/* Live banner */}
              {news?.filter(n => n.isLive).length > 0 && (
                <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-red/5 border border-red/20">
                  <span className="text-red animate-live-pulse">●</span>
                  <span className="text-xs font-mono text-red">
                    {news.filter(n => n.isLive).length} evento(s) en vivo detectado(s)
                  </span>
                </div>
              )}

              {/* Category summary */}
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(CAT_LABELS).map(([key, meta]) => {
                  const count = (news || []).filter(n => n.category === key).length;
                  if (!count) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setCatFilter(key)}
                      className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors ${
                        catFilter === key
                          ? "bg-foreground/10 text-foreground border-foreground/20"
                          : "bg-foreground/5 text-muted-foreground border-border hover:border-border/80"
                      }`}
                    >
                      {meta.label}: {count}
                    </button>
                  );
                })}
                {catFilter !== "all" && (
                  <button
                    onClick={() => setCatFilter("all")}
                    className="px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider text-muted-foreground border border-border hover:text-foreground"
                  >
                    × Limpiar
                  </button>
                )}
              </div>

              {/* News grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(news || [])
                  .filter(n => catFilter === "all" || n.category === catFilter)
                  .slice(0, 60)
                  .map((item, i) => (
                    <NewsCard key={i} {...item} />
                  ))}
              </div>

              {!news?.length && (
                <p className="text-center text-muted-foreground font-mono text-sm py-10">
                  — Sin noticias disponibles —
                </p>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="signals" className="mt-6">
          <SectionHeader title="Signal Panel — Voces Institucionales" tag="SIGNALS" />

          <div className="bg-foreground/[0.02] border border-border rounded-lg px-4 py-3 mb-6 flex gap-3">
            <span className="text-yellow mt-0.5">▲</span>
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
              Feeds de Substack cargados en tiempo real. Las cuentas sin feed directo incluyen un enlace a su perfil de X/Twitter.
            </p>
          </div>

          {signalsLoading ? (
            <LoadingState message="cargando señales" />
          ) : (
            <>
              {signals?.length > 0 && (
                <>
                  <SectionHeader title="Últimas publicaciones" tag="FEED" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {signals.slice(0, 30).map((item, i) => (
                      <div
                        key={i}
                        className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                            {item.name}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-wider px-1.5 py-0.5 border border-border rounded">
                            SUBSTACK
                          </span>
                        </div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm font-medium text-foreground hover:text-muted-foreground transition-colors leading-relaxed mb-2"
                        >
                          {item.title}
                        </a>
                        {item.date && (
                          <div className="text-[10px] font-mono text-muted-foreground/40">
                            {item.date.slice(0, 16)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <SignalDirectory />
        </TabsContent>
      </Tabs>
    </div>
  );
}