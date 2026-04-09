/**
 * useNewsData.js
 *
 * Changes from Base44 version:
 *  - base44.integrations.Core.InvokeLLM → InvokeLLM from @/api/integrations
 */
import { useQuery } from '@tanstack/react-query'
import { InvokeLLM } from '@/api/integrations'
import { classifyArticle, NEWS_SOURCES } from '@/lib/utils/news-classifier'

export function useNewsData() {
  return useQuery({
    queryKey: ['newsRss'],
    queryFn: async () => {
      const prompt = `Fetch the latest 5 headlines from each of these RSS news sources and return them as structured data. For each article return: title, link, source name, published date, and a brief summary.

Sources:
${NEWS_SOURCES.map((s) => `- ${s.name}: ${s.url}`).join('\n')}

Return a JSON with an "articles" array where each article has: title, link, source, date, summary.
Sort by date descending (newest first). Return maximum 60 articles total.`

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  link: { type: 'string' },
                  source: { type: 'string' },
                  date: { type: 'string' },
                  summary: { type: 'string' },
                },
              },
            },
          },
        },
      })

      const articles = (result?.articles || []).map((a) => {
        const sourceMeta = NEWS_SOURCES.find((s) => s.name === a.source)
        const defaultCat = sourceMeta ? sourceMeta.defaultCat : 'market'
        const { category, isLive } = classifyArticle(a.title, defaultCat)
        return { ...a, category, isLive }
      })

      articles.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1
        if (!a.isLive && b.isLive) return 1
        return 0
      })

      return articles
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })
}

export function useSignalFeeds() {
  return useQuery({
    queryKey: ['signalFeeds'],
    queryFn: async () => {
      const substacks = [
        { slug: 'kobeissiletter', name: 'The Kobeissi Letter', cat: 'macro', desc: 'Macro global, Fed, mercados de capital' },
        { slug: 'macroalf', name: 'Macro Alf', cat: 'macro', desc: 'Análisis macro institucional, BCE, Fed' },
        { slug: 'concoda', name: 'Concoda', cat: 'macro', desc: 'Liquidez global, eurodólares, sistema bancario' },
        { slug: 'cryptohayes', name: 'Arthur Hayes', cat: 'crypto', desc: 'Macro crypto, Bitcoin, política monetaria' },
        { slug: 'thedefiant', name: 'The Defiant', cat: 'defi', desc: 'DeFi, Layer 2, ecosistema on-chain' },
        { slug: 'pomp', name: 'Pomp Letter', cat: 'crypto', desc: 'Bitcoin, inversión, empresas crypto' },
      ]

      const prompt = `Fetch the latest 3 articles from each of these Substack newsletters. Return title, link, published date, author name, and category.

Substacks:
${substacks.map((s) => `- ${s.name} (${s.slug}.substack.com) — Category: ${s.cat}`).join('\n')}

Return JSON with "items" array. Each item: title, link, date, name (author), cat (category), source_type (always "substack").`

      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  link: { type: 'string' },
                  date: { type: 'string' },
                  name: { type: 'string' },
                  cat: { type: 'string' },
                  source_type: { type: 'string' },
                },
              },
            },
          },
        },
      })

      return result?.items || []
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  })
}