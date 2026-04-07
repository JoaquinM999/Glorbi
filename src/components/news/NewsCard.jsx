import React from "react";
import { CAT_LABELS } from "@/lib/utils/news-classifier";

const STYLE_MAP = {
  neutral: "bg-foreground/5 text-muted-foreground border-border",
  yellow: "bg-yellow/10 text-yellow border-yellow/20",
  red: "bg-red/10 text-red border-red/20",
};

export default function NewsCard({ title, link, source, date, category, isLive }) {
  const catMeta = CAT_LABELS[category] || { label: "General", style: "neutral" };
  const badgeCls = STYLE_MAP[catMeta.style] || STYLE_MAP.neutral;

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-border/80 hover:bg-secondary/50 transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[1.5px]">
          {source}
        </span>
        {isLive && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-red/15 text-red border border-red/30 animate-live-pulse">
            ● LIVE
          </span>
        )}
        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${badgeCls}`}>
          {catMeta.label}
        </span>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-medium text-foreground hover:text-muted-foreground transition-colors leading-relaxed mb-2"
      >
        {title}
      </a>
      {date && (
        <div className="text-[10px] font-mono text-muted-foreground/40">
          {date.slice(0, 16)}
        </div>
      )}
    </div>
  );
}