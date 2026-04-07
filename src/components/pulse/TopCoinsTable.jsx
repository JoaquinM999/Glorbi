import React from "react";

export default function TopCoinsTable({ coins, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg h-60 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  if (!coins.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full font-sans text-sm">
        <thead>
          <tr className="bg-secondary border-b border-border">
            <th className="px-3 py-2.5 text-left text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">#</th>
            <th className="px-3 py-2.5 text-left text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Coin</th>
            <th className="px-3 py-2.5 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">Precio</th>
            <th className="px-3 py-2.5 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider">24h</th>
            <th className="px-3 py-2.5 text-right text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">7d</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const chg24 = coin.price_change_percentage_24h || 0;
            const chg7 = coin.price_change_percentage_7d_in_currency || 0;
            const price = coin.current_price || 0;
            const priceStr = price < 1 ? `$${price.toFixed(4)}` : `$${price.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return (
              <tr key={coin.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-2.5 text-[11px] font-mono text-muted-foreground/40">
                  {coin.market_cap_rank}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[13px] font-semibold text-foreground">{coin.symbol?.toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground/40 ml-1.5">{coin.name}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-foreground">{priceStr}</td>
                <td className={`px-3 py-2.5 text-right text-[11px] font-mono ${chg24 >= 0 ? "text-green" : "text-red"}`}>
                  {chg24 >= 0 ? "▲" : "▼"}{Math.abs(chg24).toFixed(1)}%
                </td>
                <td className={`px-3 py-2.5 text-right text-[11px] font-mono hidden md:table-cell ${chg7 >= 0 ? "text-green" : "text-red"}`}>
                  {chg7 >= 0 ? "▲" : "▼"}{Math.abs(chg7).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}