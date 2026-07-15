/**
 * news.js — rutas para noticias RSS reales
 *
 * Reemplaza el enfoque anterior (LLM inventando/resumiendo RSS).
 * No requiere ninguna API key de IA.
 */
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { fetchAllNews } = require('../services/rssService')

const router = express.Router()
router.use(authMiddleware)

// ── GET /api/news ──────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const articles = await fetchAllNews(60)
    res.json({ articles })
  } catch (err) {
    console.error('[news]', err.message)
    res.status(502).json({ error: 'rss_error', message: 'No se pudieron cargar las noticias' })
  }
})

module.exports = router
