/**
 * integrations.js
 *
 * Replaces base44.integrations.Core.InvokeLLM().
 *
 * Two strategies are provided:
 *
 * 1. BACKEND PROXY (recommended for production):
 *    Your backend exposes POST /api/ai/invoke and forwards the request
 *    to OpenAI / Anthropic, keeping your API key server-side.
 *
 * 2. DIRECT CALL (dev only, key in .env):
 *    Calls the AI provider directly from the browser using VITE_AI_API_KEY.
 *    Only use this locally — never ship a real API key to the browser.
 *
 * The original InvokeLLM signature accepted:
 *   { prompt, model, response_json_schema, add_context_from_internet }
 *
 * This implementation mirrors that interface so call-sites need minimal changes.
 */
import apiClient from './Apiclient'

const USE_BACKEND_PROXY = false // flip to false for direct dev calls

/**
 * Invoke an LLM via your backend proxy.
 * Backend should accept POST /api/ai/invoke and return { result: string | object }.
 */
async function invokeViaBackend({ prompt, model = 'gpt-4o-mini', response_json_schema }) {
  const { data } = await apiClient.post('/api/ai/invoke', {
    prompt,
    model,
    response_json_schema,
  })
  if (response_json_schema) {
    if (typeof data.result === 'string') {
      try {
        return JSON.parse(data.result.replace(/```json|```/g, '').trim())
      } catch {
        return data.result
      }
    }
    return data.result
  }
  return typeof data.result === 'string' ? data.result : JSON.stringify(data.result)
}

/**
 * DEV ONLY — calls OpenAI directly from the browser.
 * Requires VITE_AI_API_KEY in your .env.local file.
 */
async function invokeDirectly({ prompt, response_json_schema }) {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) throw new Error('VITE_AI_API_KEY is not set in .env.local')

  const systemPrompt = response_json_schema
    ? 'You are a helpful assistant. Respond ONLY with valid JSON matching the given schema. No markdown, no explanation.'
    : 'You are a helpful assistant.'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const json = await response.json()
  const text = json.choices?.[0]?.message?.content ?? ''

  if (response_json_schema) {
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return text
    }
  }
  return text
}

/**
 * Public interface — mirrors base44.integrations.Core.InvokeLLM()
 *
 * Usage (unchanged from Base44):
 *   const result = await InvokeLLM({ prompt: '...', response_json_schema: { ... } })
 */
export async function InvokeLLM(params) {
  return USE_BACKEND_PROXY
    ? invokeViaBackend(params)
    : invokeDirectly(params)
}

export const integrations = {
  Core: { InvokeLLM },
}

export default integrations