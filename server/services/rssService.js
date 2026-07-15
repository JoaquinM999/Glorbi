/**
 * rssService.js
 *
 * Lee feeds RSS reales usando rss-parser. Reemplaza el enfoque anterior
 * que le pedía a un LLM que "trajera" noticias (lo cual no tiene sentido —
 * un LLM no puede leer internet en tiempo real a menos que tenga tool use,
 * y Base44 lo hacía con su propio wrapper). Esto es más rápido, gratis,
 * y no depende de ninguna API key.
 */
const Parser = require('rss-parser')
const parser = new Parser({ timeout: 8000 })

const NEWS_SOURCES = [
  { url: 'https://es.cointelegraph.com/rss',                name: 'CoinTelegraph ES', defaultCat: 'market' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',  name: 'CoinDesk',         defaultCat: 'market' },
  { url: 'https://decrypt.co/feed',                          name: 'Decrypt',          defaultCat: 'market' },
  { url: 'https://bitcoinmagazine.com/.rss/full/',           name: 'Bitcoin Magazine', defaultCat: 'protocol' },
  { url: 'https://cryptoslate.com/feed/',                    name: 'CryptoSlate',      defaultCat: 'defi' },
  { url: 'https://thedefiant.io/feed',                       name: 'The Defiant',      defaultCat: 'defi' },
  { url: 'https://www.dlnews.com/rss.xml',                   name: 'DL News',          defaultCat: 'market' },
]

/**
 * Trae los últimos N artículos de un feed RSS individual.
 * Devuelve [] silenciosamente si el feed falla (no tira la app entera).
 */
async function fetchFeed(source, limit = 5) {
  try {
    const feed = await parser.parseURL(source.url)
    return (feed.items || []).slice(0, limit).map((item) => ({
      title:   item.title || '',
      link:    item.link || '',
      source:  source.name,
      date:    item.isoDate || item.pubDate || '',
      summary: (item.contentSnippet || item.content || '').slice(0, 200),
      defaultCat: source.defaultCat,
    }))
  } catch (err) {
    console.error(`[rss] Error leyendo ${source.name}:`, err.message)
    return []
  }
}

/**
 * Trae todas las fuentes en paralelo y devuelve un array combinado,
 * ordenado por fecha descendente.
 */
async function fetchAllNews(limit = 60) {
  const results = await Promise.all(
    NEWS_SOURCES.map((source) => fetchFeed(source, 5))
  )
  const combined = results.flat()
  combined.sort((a, b) => new Date(b.date) - new Date(a.date))
  return combined.slice(0, limit)
}

module.exports = { fetchAllNews, NEWS_SOURCES }
