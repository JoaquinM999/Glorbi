/**
 * useNewsData.js
 *
 * Antes: le pedía a un LLM que "trajera" noticias de RSS (lento, poco confiable,
 * y requería una API key de IA para algo que no la necesita).
 *
 * Ahora: consulta GET /api/news, que lee los feeds RSS reales en el backend
 * con rss-parser. No depende de ninguna API key de IA.
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/apiClient'
import { classifyArticle } from '@/lib/utils/news-classifier'

export function useNewsData() {
  return useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/news')
      const articles = (data.articles || []).map((a) => {
        const { category, isLive } = classifyArticle(a.title, a.defaultCat || 'market')
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

/**
 * Signal feeds de Substack — se mantiene deshabilitado por ahora ya que
 * requeriría parsear feeds adicionales de Substack (no todos exponen RSS público
 * de forma consistente). Devuelve un array vacío para que la UI no rompa.
 * Si querés esto activo, puedo agregar los feeds de Substack a rssService.js.
 */
export function useSignalFeeds() {
  return useQuery({
    queryKey: ['signalFeeds'],
    queryFn: async () => [],
    staleTime: Infinity,
  })
}
