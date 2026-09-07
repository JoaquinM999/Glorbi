import React from 'react';
import { useLocalPanel } from '@/lib/hooks/useLocalMarketData';

export default function TopMovers() {
  const { data, error, isLoading } = useLocalPanel('merval');

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Cargando movers...</div>;
  if (error || !data || !data.titulos) return null;

  const getVar = (t) => t.variacionPorcentual ?? t.variacion ?? 0;
  const sorted = [...data.titulos].sort((a, b) => getVar(b) - getVar(a));
  const gainers = sorted.slice(0, 3);
  const losers = sorted.slice().reverse().slice(0, 3);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold mb-3">Top Movers (Merval)</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Mayores Alzas</h4>
          <ul className="space-y-2">
            {gainers.map(g => (
              <li key={g.simbolo} className="flex justify-between text-sm">
                <span>{g.simbolo}</span>
                <span className="text-green-500">+{getVar(g).toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Mayores Bajas</h4>
          <ul className="space-y-2">
            {losers.map(l => (
              <li key={l.simbolo} className="flex justify-between text-sm">
                <span>{l.simbolo}</span>
                <span className="text-red-500">{getVar(l).toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
