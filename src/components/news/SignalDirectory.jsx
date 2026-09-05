import React, { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/api/apiClient";
import { useXFeed } from "@/lib/hooks/useNewsData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

const X_ACCOUNTS = [
  { handle: "KobeissiLetter", name: "The Kobeissi Letter", cat: "macro", desc: "Macro global, Fed, índices, flujos institucionales", emoji: "📊" },
  { handle: "MacroAlf", name: "Macro Alf", cat: "macro", desc: "Análisis macro, BCE, tasas, eurodólares", emoji: "🏦" },
  { handle: "zerohedge", name: "ZeroHedge", cat: "macro", desc: "Noticias macro, crisis, alertas de mercado", emoji: "⚡" },
  { handle: "unusual_whales", name: "Unusual Whales", cat: "macro", desc: "Flujos de opciones, congreso, movimientos institucionales", emoji: "🐋" },
  { handle: "GameofTrades_", name: "Game of Trades", cat: "macro", desc: "Análisis técnico macro, S&P, cripto", emoji: "📈" },
  { handle: "WClementeIII", name: "Will Clemente", cat: "onchain", desc: "On-chain Bitcoin, indicadores de largo plazo", emoji: "🔗" },
  { handle: "WatcherGuru", name: "Watcher Guru", cat: "crypto", desc: "Alertas cripto en tiempo real, noticias rápidas", emoji: "👁" },
  { handle: "lookonchain", name: "Look On Chain", cat: "onchain", desc: "Movimientos de ballenas, flujos exchange, wallets", emoji: "🔍" },
  { handle: "CryptoHayes", name: "Arthur Hayes", cat: "crypto", desc: "Macro Bitcoin, política monetaria, ensayos", emoji: "₿" },
  { handle: "APompliano", name: "Anthony Pompliano", cat: "crypto", desc: "Bitcoin, macro, inversión institucional", emoji: "🟠" },
  { handle: "tier10k", name: "Tier10k", cat: "defi", desc: "DeFi profundo, protocolos, tokenomics", emoji: "⚙️" },
  { handle: "federalreserve", name: "Federal Reserve", cat: "fed", desc: "Comunicados oficiales Fed, datos económicos", emoji: "🏛" },
  { handle: "POTUS", name: "White House / POTUS", cat: "politics", desc: "Comunicados oficiales Casa Blanca", emoji: "🇺🇸" },
  { handle: "GoldmanSachs", name: "Goldman Sachs", cat: "macro", desc: "Research institucional, perspectivas de mercado", emoji: "🏢" },
  { handle: "markets", name: "Bloomberg Markets", cat: "macro", desc: "Breaking news mercados, datos en tiempo real", emoji: "📡" },
  { handle: "nicktimiraos", name: "Nick Timiraos (WSJ)", cat: "fed", desc: "'Oráculo de la Fed' — filtra las decisiones de Powell", emoji: "📰" },
];

const CATS = [
  { value: "all", label: "Todos" },
  { value: "macro", label: "Macro" },
  { value: "crypto", label: "Crypto" },
  { value: "onchain", label: "On-Chain" },
  { value: "fed", label: "Fed" },
  { value: "defi", label: "DeFi" },
  { value: "politics", label: "Política" },
];

const CAT_COLORS = {
  macro: { text: "text-muted-foreground", bg: "bg-foreground/5" },
  crypto: { text: "text-green", bg: "bg-green/5" },
  onchain: { text: "text-green", bg: "bg-green/5" },
  fed: { text: "text-yellow", bg: "bg-yellow/5" },
  defi: { text: "text-muted-foreground", bg: "bg-foreground/5" },
  politics: { text: "text-red", bg: "bg-red/5" },
};

export default function SignalDirectory() {
  const [filter, setFilter] = useState("all");
  const [customHandle, setCustomHandle] = useState("");
  const queryClient = useQueryClient();
  const { data: xFeed } = useXFeed();
  const subscriptions = xFeed?.subscriptions || [];

  const subscriptionMutation = useMutation({
    mutationFn: async ({ handle, subscribed }) => {
      if (subscribed) await apiClient.delete(`/api/x-feed/${handle}`);
      else await apiClient.post("/api/x-feed", { handle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xFeed"] });
      toast.success("Suscripciones actualizadas");
    },
    onError: (error) => toast.error(error.response?.data?.message || "No se pudo actualizar la suscripción"),
  });

  const subscribeCustom = (event) => {
    event.preventDefault();
    const handle = customHandle.replace(/^@/, "").trim();
    if (!handle) return;
    subscriptionMutation.mutate({ handle, subscribed: false });
    setCustomHandle("");
  };

  const filtered = X_ACCOUNTS.filter(a => filter === "all" || a.cat === filter);

  return (
    <div>
      <SectionHeader title="Directorio de cuentas X — señales clave" tag="DIRECTORIO" />

      <form onSubmit={subscribeCustom} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={customHandle}
          onChange={(event) => setCustomHandle(event.target.value)}
          placeholder="@usuario de X"
          aria-label="Usuario de X"
          className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring"
        />
        <button type="submit" disabled={subscriptionMutation.isPending} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-xs font-mono hover:bg-secondary disabled:opacity-50">
          {subscriptionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
          Suscribirme
        </button>
      </form>

      <div className="mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 bg-card border-border font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {CATS.map(c => (
              <SelectItem key={c.value} value={c.value} className="font-mono text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((account) => {
          const colors = CAT_COLORS[account.cat] || CAT_COLORS.macro;
          const catLabel = CATS.find(c => c.value === account.cat)?.label || account.cat.toUpperCase();

          return (
            <div
              key={account.handle}
              className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{account.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{account.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
                      @{account.handle}
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-border ${colors.bg} ${colors.text}`}>
                  {catLabel}
                </span>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed mb-3">
                {account.desc}
              </p>
              <a
                href={`https://x.com/${account.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 border border-border rounded px-2 py-1 hover:text-foreground hover:border-border/80 transition-colors"
              >
                Ver en X <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => subscriptionMutation.mutate({ handle: account.handle, subscribed: subscriptions.includes(account.handle) })}
                disabled={subscriptionMutation.isPending}
                className="inline-flex items-center gap-1.5 ml-2 text-[10px] font-mono text-muted-foreground/60 border border-border rounded px-2 py-1 hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-50"
              >
                {subscriptions.includes(account.handle) ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                {subscriptions.includes(account.handle) ? "Dejar de seguir" : "Seguir"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}