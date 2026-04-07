import React from "react";

export default function SectionHeader({ title, tag }) {
  return (
    <div className="flex items-center gap-3 my-6 text-[13px] font-medium text-muted-foreground uppercase tracking-[2px]">
      {tag && (
        <span className="text-[9px] font-mono text-muted-foreground/50 tracking-[2px] uppercase border border-border px-2 py-0.5 rounded">
          {tag}
        </span>
      )}
      <span>{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}