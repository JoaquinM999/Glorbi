import { useQuery } from "@tanstack/react-query";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useFearGreed() {
  return useQuery({
    queryKey: ["fearGreed"],
    queryFn: async () => {
      const data = await fetchJson("https://api.alternative.me/fng/?limit=30");
      const items = data.data;
      const current = items[0];
      const history = [...items].reverse();
      return {
        value: parseInt(current.value),
        label: current.value_classification,
        history: history.map(d => ({
          value: parseInt(d.value),
          label: d.value_classification,
          ts: d.timestamp,
        })),
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useBtcDominance() {
  return useQuery({
    queryKey: ["btcDominance"],
    queryFn: async () => {
      const d = (await fetchJson("https://api.coingecko.com/api/v3/global")).data;
      return {
        btcDom: Math.round(d.market_cap_percentage.btc * 10) / 10,
        ethDom: Math.round((d.market_cap_percentage.eth || 0) * 10) / 10,
        totalMcap: d.total_market_cap.usd,
        totalVol: d.total_volume.usd,
        mcapChange24h: Math.round(d.market_cap_change_percentage_24h_usd * 100) / 100,
        activeCryptos: d.active_cryptocurrencies,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useTopCoins() {
  return useQuery({
    queryKey: ["topCoins"],
    queryFn: () => fetchJson(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h,7d"
    ),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useTrendingCoins() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const data = await fetchJson("https://api.coingecko.com/api/v3/search/trending");
      return (data.coins || []).slice(0, 7);
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useBtcHistory(days = 30) {
  return useQuery({
    queryKey: ["btcHistory", days],
    queryFn: async () => {
      const data = await fetchJson(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );
      const prices = data.prices || [];
      const mcaps = data.market_caps || [];
      return prices.map((p, i) => ({
        ts: p[0],
        price: p[1],
        mcap: mcaps[i] ? mcaps[i][1] : 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}