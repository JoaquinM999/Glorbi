const express = require('express')
const axios = require('axios')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

// ── Google Translate (free gtx endpoint) ─────────────────────────────────────
// Used as zero-config fallback when LIBRETRANSLATE_URL is not set.
// No API key needed. Rate-limited by Google but fine for small-scale usage.
async function translateViaGoogle(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single`
  const { data } = await axios.get(url, {
    params: { client: 'gtx', sl: 'auto', tl: target, dt: 't', q: text },
    timeout: 10000,
  })
  // Response is a nested array: [[["translated text","original text",...],...],...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected Google Translate response format')
  }
  return data[0].map((segment) => (segment?.[0] || '')).join('')
}

// ── LibreTranslate (self-hosted / paid instance) ─────────────────────────────
async function translateViaLibre(text, target) {
  const baseUrl = process.env.LIBRETRANSLATE_URL.replace(/\/$/, '')
  const { data } = await axios.post(`${baseUrl}/translate`, {
    q: text,
    source: 'auto',
    target,
    format: 'text',
    ...(process.env.LIBRETRANSLATE_API_KEY ? { api_key: process.env.LIBRETRANSLATE_API_KEY } : {}),
  }, { timeout: 15000 })
  return data.translatedText
}

// ── POST /api/news/translate ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const text = String(req.body.text || '').trim()
  const target = req.body.target === 'en' ? 'en' : 'es'
  if (!text) return res.status(400).json({ error: 'empty_text' })

  try {
    const translated = process.env.LIBRETRANSLATE_URL
      ? await translateViaLibre(text, target)
      : await translateViaGoogle(text, target)
    res.json({ text: translated, target })
  } catch (err) {
    console.error('[translation]', err.response?.data || err.message)
    res.status(502).json({ error: 'translation_error', message: 'No se pudo traducir esta noticia' })
  }
})

module.exports = router