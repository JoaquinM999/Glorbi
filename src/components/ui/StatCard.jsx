/**
 * StatCard.jsx
 *
 * Card de KPI con efecto GlareHover (brillo + tilt 3D) y números animados
 * (CountUp). La animación de entrada (stagger) se controla desde el padre.
 */
import React from "react";
import GlareHover from "@/components/ui/GlareHover";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

export default function StatCard({ eyebrow, value, badge, badgeType = "neutral", children }) {
  const badgeStyles = {
    positive: "bg-green/10 text-green",
    negative: "bg-red/10 text-red",
    neutral: "bg-foreground/5 text-muted-foreground",
  };

  return (
    <GlareHover className="gradient-border bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors h-full flex flex-col justify-between">
      <div>
        <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
          {eyebrow}
        </div>
        <div className="text-2xl md:text-3xl font-mono font-normal text-foreground tracking-tight leading-none">
          <AnimatedNumber value={value} />
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
