import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { useMacroData } from '@/lib/hooks/useLocalMarketData';

export default function MacroKPIBar() {
  const { data, isLoading } = useMacroData();
  
  if (isLoading) return <div className="text-muted-foreground text-sm">Cargando macro...</div>;
  if (!data) return null;

  const blue = data.dolares?.find(d => d.casa === 'blue');
  const mep = data.dolares?.find(d => d.casa === 'bolsa');
  const ccl = data.dolares?.find(d => d.casa === 'contadoconliqui');
  const riesgo = data.riesgoPais?.valor;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard eyebrow="Dólar Blue" value={`$${blue?.venta || '-'}`} badgeType="neutral" />
      <StatCard eyebrow="Dólar MEP" value={`$${mep?.venta || '-'}`} badgeType="neutral" />
      <StatCard eyebrow="Dólar CCL" value={`$${ccl?.venta || '-'}`} badgeType="neutral" />
      <StatCard eyebrow="Riesgo País" value={riesgo ? `${riesgo} pts` : '-'} badgeType="neutral" />
    </div>
  );
}
