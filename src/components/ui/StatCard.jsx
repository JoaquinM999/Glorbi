import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ eyebrow, value, badge, badgeType = "neutral", children }) {
  const badgeStyles = {
    positive: "bg-green/10 text-green",
    negative: "bg-red/10 text-red",
    neutral: "bg-foreground/5 text-muted-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-xl p-5 relative overflow-hidden hover:border-border/80 transition-colors"
    >
      <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-2">
        {eyebrow}
      </div>
      <div className="text-2xl md:text-3xl font-mono font-normal text-foreground tracking-tight leading-none">
        {value}
      </div>
      {badge && (
        <div className={`inline-flex items-center mt-3 px-2.5 py-1 rounded-md text-[11px] font-mono ${badgeStyles[badgeType]}`}>
          {badge}
        </div>
      )}
      {children}
    </motion.div>
  );
}