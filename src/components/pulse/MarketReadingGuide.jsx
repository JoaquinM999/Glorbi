import React, { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { ChevronDown, ChevronUp } from "lucide-react";

const FG_ZONES = [
  { range: "0 – 24",   label: "Miedo Extremo",  color: "text-red",    bg: "bg-red/5   border-red/15",   desc: "Capitulación generalizada. Históricamente un indicador de compra contrarian a largo plazo. El mercado suele estar sobrevendido." },
  { range: "25 – 44",  label: "Miedo",           color: "text-yellow", bg: "bg-yellow/5 border-yellow/15",desc: "Predominan los vendedores. El sentimiento es negativo, pero no en pánico. Posible acumulación institucional silenciosa." },
  { range: "45 – 55",  label: "Neutral",          color: "text-muted-foreground", bg: "bg-secondary border-border", desc: "Mercado en equilibrio. Sin señal clara de dirección por sentimiento. Observa otros indicadores como dominancia y OI." },
  { range: "56 – 74",  label: "Codicia",          color: "text-green",  bg: "bg-green/5  border-green/15", desc: "El sentimiento alcista impulsa el precio. Aumenta el riesgo de una corrección a corto plazo. Monitorear posiciones abiertas." },
  { range: "75 – 100", label: "Codicia Extrema",  color: "text-green",  bg: "bg-green/5  border-green/15", desc: "FOMO masivo. Históricamente asociado a techos de mercado. Señal de precaución — el rally puede revertir con fuerza." },
];

const DOM_READINGS = [
  { range: "BTC Dom > 60%", label: "Alta Dominancia", color: "text-yellow", desc: "Bitcoin absorbe capital. Las altcoins pierden valor relativo (altcoin season improbable). Señal de risk-off o ciclo temprano." },
  { range: "BTC Dom 50–60%", label: "Dominancia Media", color: "text-muted-foreground", desc: "Equilibrio entre BTC y alts. El mercado puede moverse en paralelo o BTC puede liderar con alts siguiendo con retraso." },
  { range: "BTC Dom < 50%", label: "Baja Dominancia", color: "text-green", desc: "Capital rotando a altcoins (altcoin season activa). BTC puede estar en distribución. Mayor especulación en el mercado total." },
];

function GuideSection({ title, rows, labelKey, rangeKey, descKey, colorKey, bgKey }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-[2px] mb-3">{title}</h3>
      {rows.map((row, i) => (
        <div key={i} className={`rounded-lg border px-4 py-3 ${row[bgKey]}`}>
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-[11px] font-mono font-medium ${row[colorKey]}`}>{row[rangeKey]}</span>
            <span className={`text-xs font-semibold ${row[colorKey]}`}>— {row[labelKey]}</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed">{row[descKey]}</p>
        </div>
      ))}
    </div>
  );
}

export default function MarketReadingGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[2px] border border-border px-2 py-0.5 rounded">GUÍA</span>
          <span className="text-sm font-mono font-medium text-foreground">Guía de lectura — Fear & Greed y Dominancia BTC</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-border pt-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GuideSection
            title="Fear & Greed Index — Rangos"
            rows={FG_ZONES}
            rangeKey="range"
            labelKey="label"
            descKey="desc"
            colorKey="color"
            bgKey="bg"
          />
          <GuideSection
            title="Dominancia BTC — Interpretación"
            rows={DOM_READINGS}
            rangeKey="range"
            labelKey="label"
            descKey="desc"
            colorKey="color"
            bgKey="bg"
          />
        </div>
      )}
    </div>
  );
}