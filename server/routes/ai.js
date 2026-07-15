const express = require('express')
const axios = require('axios')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// Require authentication so only logged-in users can invoke the AI
router.use(authMiddleware)

// ── POST /api/ai/invoke ───────────────────────────────────────────────────────
router.post('/invoke', async (req, res) => {
  try {
    const { prompt, model, response_json_schema } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' })
    }

    const provider = process.env.AI_PROVIDER || 'anthropic'
    const hasKey = provider === 'anthropic'
      ? Boolean(process.env.ANTHROPIC_API_KEY)
      : Boolean(process.env.OPENAI_API_KEY)

    if (!hasKey) {
      // Esta función es OPCIONAL — el resto de la app funciona sin esto.
      // No es un error del servidor, es simplemente una feature no configurada.
      return res.status(503).json({
        error: 'ai_not_configured',
        message: 'La función de IA no está configurada. Es opcional — el resto de Glorbi funciona sin ella.',
      })
    }

    let result
    if (provider === 'anthropic') {
      result = await callAnthropic(prompt, response_json_schema)
    } else if (provider === 'openai') {
      result = await callOpenAI(prompt, model, response_json_schema)
    } else {
      return res.status(400).json({ error: `Unknown AI_PROVIDER: ${provider}` })
    }

    res.json({ result })
  } catch (err) {
    console.error('[ai/invoke]', err?.response?.data || err.message)
    const status = err?.response?.status || 500
    const message = err?.response?.data?.error?.message || err.message || 'AI request failed'
    res.status(status).json({ error: message })
  }
})

// ── Anthropic (Claude) ────────────────────────────────────────────────────────
async function callAnthropic(prompt, response_json_schema) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in server/.env')

  const systemPrompt = response_json_schema
    ? 'You are a helpful assistant. Respond ONLY with valid JSON that matches the provided schema. No markdown, no code fences, no explanation — just the JSON object.'
    : 'You are a helpful assistant.'

  const userContent = response_json_schema
    ? `${prompt}\n\nRespond with JSON matching this schema:\n${JSON.stringify(response_json_schema, null, 2)}`
    : prompt

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  )

  const text = response.data.content?.[0]?.text || ''

  if (response_json_schema) {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return text
    }
  }
  return text
}

// ── OpenAI (GPT) ─────────────────────────────────────────────────────────────
async function callOpenAI(prompt, model = 'gpt-4o-mini', response_json_schema) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in server/.env')

  const systemPrompt = response_json_schema
    ? 'You are a helpful assistant. Respond ONLY with valid JSON. No markdown, no code fences.'
    : 'You are a helpful assistant.'

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      ...(response_json_schema ? { response_format: { type: 'json_object' } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
    }
  )

  const text = response.data.choices?.[0]?.message?.content || ''

  if (response_json_schema) {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return text
    }
  }
  return text
}

module.exports = router
