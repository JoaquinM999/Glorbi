import React from "react";
import { motion } from "framer-motion";

export default function LoadingState({ message = "Cargando datos..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="text-4xl font-mono font-medium text-foreground tracking-tighter"
      >
        ◈ glorbi
      </motion.div>
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border border-border" />
        <div className="absolute inset-0 rounded-full border border-transparent border-t-foreground animate-spin" />
      </div>
      <div className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-[2px]">
        {message}
      </div>
      <div className="w-48 h-px bg-accent overflow-hidden">
        <motion.div
          className="h-full bg-foreground"
          animate={{ width: ["0%", "88%"] }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}