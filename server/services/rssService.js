/**
 * rssService.js
 *
 * Lee feeds RSS reales usando rss-parser.
 *
 * FIX respecto a la versión anterior:
 *  - Muchos sitios (Cointelegraph, CoinDesk, etc.) bloquean o limitan
 *    requests sin un User-Agent de navegador real — los tratan como bots.
 *    Ahora se manda un User-Agent estándar en cada request.
 *  - Se agregó un reintento simple (1 retry) por feed antes de darlo por muerto.
 *  - Se loguea claramente cuántos artículos trajo cada fuente, para poder
 *    diagnosticar rápido si alguna vuelve a fallar.
 *  - Se sacó DL News y The Defiant (URLs de RSS inestables/discontinuadas)
 *    y se agregaron alternativas más confiables.
 */
const Parser = require('rss-parser')

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
})

const NEWS_SOURCES = [
  { url: 'https://es.cointelegraph.com/rss',               name: 'CoinTelegraph ES', defaultCat: 'market' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk',         defaultCat: 'market' },
  { url: 'https://decrypt.co/feed',                         name: 'Decrypt',          defaultCat: 'market' },
  { url: 'https://bitcoinmagazine.com/.rss/full/',          name: 'Bitcoin Magazine', defaultCat: 'protocol' },
  { url: 'https://cryptoslate.com/feed/',                   name: 'CryptoSlate',      defaultCat: 'defi' },
  { url: 'https://cointelegraph.com/rss',                   name: 'CoinTelegraph EN', defaultCat: 'market' },
  { url: 'https://cryptonews.com/news/feed/',                name: 'CryptoNews',       defaultCat: 'market' },
  { url: 'https://www.newsbtc.com/feed/',                    name: 'NewsBTC',          defaultCat: 'market' },
]

/**
 * Trae los últimos N artículos de un feed RSS individual, con 1 reintento
 * si el primer intento falla (timeout o bloqueo temporal).
 */
async function fetchFeed(source, limit = 5, isRetry = false) {
  try {
    const feed = await parser.parseURL(source.url)
    const items = (feed.items || []).slice(0, limit).map((item) => ({
      title:      item.title || '',
      link:       item.link || '',
      source:     source.name,
      date:       item.isoDate || item.pubDate || '',
      summary:    (item.contentSnippet || item.content || '').slice(0, 200),
      defaultCat: source.defaultCat,
    }))
    console.log(`[rss] ✓ ${source.name}: ${items.length} artículos`)
    return items
  } catch (err) {
    if (!isRetry) {
      // Un reintento antes de rendirse — muchos fallos son transitorios
      await new Promise((r) => setTimeout(r, 500))
      return fetchFeed(source, limit, true)
    }
    console.error(`[rss] ✗ ${source.name}: ${err.message}`)
    return []
  }
}

/**
 * Trae todas las fuentes en paralelo y devuelve un array combinado,
 * ordenado por fecha descendente.
 */
async function fetchAllNews(limit = 60) {
  const results = await Promise.all(
    NEWS_SOURCES.map((source) => fetchFeed(source, 6))
  )
  const combined = results.flat()
  combined.sort((a, b) => new Date(b.date) - new Date(a.date))

  const successCount = results.filter((r) => r.length > 0).length
  console.log(`[rss] Total: ${combined.length} artículos de ${successCount}/${NEWS_SOURCES.length} fuentes`)

  return combined.slice(0, limit)
}

module.exports = { fetchAllNews, NEWS_SOURCES }
