import React from "react";
import { usePeriod, PERIODS } from "@/lib/PeriodContext";

export default function PeriodSelector() {
  const { activePeriod, setActivePeriod } = usePeriod();

  return (
    <div className="flex items-center gap-1 bg-secondary border border-border rounded-lg p-1">
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => setActivePeriod(p.key)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all duration-150
            ${activePeriod === p.key
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}