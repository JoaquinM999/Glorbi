import React, { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import apiClient from "@/api/apiClient";
import { CAT_LABELS } from "@/lib/utils/news-classifier";
import GlareHover from "@/components/ui/GlareHover";

const STYLE_MAP = {
  neutral: "bg-foreground/5 text-muted-foreground border-border",
  yellow: "bg-yellow/10 text-yellow border-yellow/20",
  red: "bg-red/10 text-red border-red/20",
};

export default function NewsCard({ title, summary, link, source, date, category, isLive }) {
  const [language, setLanguage] = useState('original');
  const [translated, setTranslated] = useState(null);
  const [translating, setTranslating] = useState(false);
  const catMeta = CAT_LABELS[category] || { label: "General", style: "neutral" };
  const badgeCls = STYLE_MAP[catMeta.style] || STYLE_MAP.neutral;

  const toggleTranslation = async () => {
    if (translated) return setLanguage(language === 'original' ? 'translated' : 'original');
    setTranslating(true);
    try {
      const target = /[áéíóúñ¿¡]/i.test(title) ? 'en' : 'es';
      const { data } = await apiClient.post('/api/news/translate', { text: `${title}\n\n${summary || ''}`, target });
      setTranslated({ text: data.text, target });
      setLanguage('translated');
    } catch {
      setTranslated({ text: 'Traducción no disponible en este momento', target: null });
      setLanguage('translated');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <GlareHover className="bg-card border border-border rounded-lg p-4 hover:border-border/80 hover:bg-secondary/50 transition-all duration-200">
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
        {language === 'translated' && translated ? translated.text : title}
      </a>
      <button type="button" onClick={toggleTranslation} disabled={translating} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 hover:text-foreground transition-colors">
        {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
        {language === 'translated' ? 'Ver original' : 'Traducir'}
      </button>
      {date && (
        <div className="text-[10px] font-mono text-muted-foreground/40">
          {date.slice(0, 16)}
        </div>
      )}
    </GlareHover>
  );
}