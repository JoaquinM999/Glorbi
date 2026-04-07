import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useScreenerData() {
  return useQuery({
    queryKey: ["screenerData"],
    queryFn: async () => {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Get the latest derivatives market data for the top 20 cryptocurrency perpetual futures pairs by Open Interest.

For each pair provide:
- symbol (e.g. BTCUSDT)
- price (current price in USD)
- open_interest (total open interest in USD)
- oi_change_24h (open interest change percentage in 24h)
- funding_rate (current funding rate as a percentage, positive means longs pay shorts)
- long_liquidations_24h (total long liquidations in USD in past 24h)
- short_liquidations_24h (total short liquidations in USD in past 24h)  
- volume_24h (24h trading volume in USD)
- long_short_ratio (ratio of long to short accounts, e.g. 1.2 means more longs)

Return a JSON object with a "pairs" array sorted by open_interest descending.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            pairs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symbol: { type: "string" },
                  price: { type: "number" },
                  open_interest: { type: "number" },
                  oi_change_24h: { type: "number" },
                  funding_rate: { type: "number" },
                  long_liquidations_24h: { type: "number" },
                  short_liquidations_24h: { type: "number" },
                  volume_24h: { type: "number" },
                  long_short_ratio: { type: "number" },
                },
              },
            },
          },
        },
      });

      return result.pairs || [];
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });
}