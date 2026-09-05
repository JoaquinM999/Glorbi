/**
 * StatCard.jsx
 *
 * CAMBIO: ya no es un motion.div con animación propia. Antes tenía su
 * propia entrada (fade + slide) independiente, lo cual chocaba con el
 * efecto "stagger" (entrada escalonada) que ahora se aplica desde el
 * componente padre (ej. Dashboard.jsx envolviendo cada StatCard en su
 * propio <motion.div variants={staggerItemSubtle}>) — con dos animaciones
 * independientes anidadas, la del padre no se veía porque el hijo ya
 * arrancaba con su propio estado inicial por separado.
 *
 * Ahora StatCard es un div común; quien lo use decide cómo animarlo
 * (o no animarlo) desde afuera.
 */
import React from "react";
import GlareHover from "@/components/ui/GlareHover";

export default function StatCard({ eyebrow, value, badge, badgeType = "neutral", children }) {
  const badgeStyles = {
    positive: "bg-green/10 text-green",
    negative: "bg-red/10 text-red",
    neutral: "bg-foreground/5 text-muted-foreground",
  };

  return (
    <GlareHover className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors h-full flex flex-col justify-between">
      <div>
        <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
          {eyebrow}
        </div>
        <div className="text-2xl md:text-3xl font-mono font-normal text-foreground tracking-tight leading-none">
          {value}
        </div>
      </div>

      {badge && (
        <div className={`inline-flex items-center self-start mt-3 px-2.5 py-1 rounded-md text-[11px] font-mono ${badgeStyles[badgeType]}`}>
          {badge}
        </div>
      )}
      {children}
    </GlareHover>
  );
}
