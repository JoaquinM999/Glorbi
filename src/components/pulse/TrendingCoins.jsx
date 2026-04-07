import React from "react";

export default function TrendingCoins({ coins, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg h-40 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  if (!coins.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {coins.map((item, i) => {
        const c = item.item;
        return (
          <div
            key={c.id || i}
            className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-muted-foreground/30 min-w-[14px]">{i + 1}</span>
              <span className="text-[13px] font-mono font-medium text-foreground">{c.symbol}</span>
              <span className="text-[10px] font-mono text-muted-foreground/40">{c.name}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/30 whitespace-nowrap">
              #{c.market_cap_rank || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}