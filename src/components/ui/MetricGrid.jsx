import React from "react";

export function MetricRow({ label, value, colorClass = "" }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-foreground/[0.02] transition-colors">
      <span className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-[1.5px]">
        {label}
      </span>
      <span className={`text-[13px] font-mono font-medium ${colorClass || "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export default function MetricGrid({ children }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {children}
    </div>
  );
}