import React from 'react';
import { useLocalPanel } from '@/lib/hooks/useLocalMarketData';

export default function LocalPanelTable({ panel, title }) {
  const { data, error, isLoading } = useLocalPanel(panel);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Cargando {title}...</div>;
  if (error) return <div className="p-4 text-sm text-red-500">Error al cargar {title}. {error.message || 'Verifica tus credenciales de IOL.'}</div>;
  if (!data || !data.titulos) return <div className="p-4 text-sm text-muted-foreground">No hay datos para {title} o faltan credenciales IOL.</div>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Símbolo</th>
              <th className="px-4 py-3 font-medium">Último Precio</th>
              <th className="px-4 py-3 font-medium">Variación</th>
              <th className="px-4 py-3 font-medium">Volumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.titulos.slice(0, 15).map((t) => {
              const varPct = t.variacionPorcentual ?? t.variacion ?? 0;
              const isPositive = varPct >= 0;
              return (
                <tr key={t.simbolo} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.simbolo}</td>
                  <td className="px-4 py-3">${t.ultimoPrecio?.toLocaleString() || '-'}</td>
                  <td className={`px-4 py-3 font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{varPct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3">{t.volumen?.toLocaleString() || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
