const express = require('express')
const { stmts, generateId } = require('../db/database')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// All routes require authentication
router.use(authMiddleware)

// ── GET /api/user-settings?created_by=email ───────────────────────────────────
router.get('/', (req, res) => {
  try {
    // Enforce ownership: always filter by the authenticated user's email
    const rows = stmts.getSettingsByOwner.all(req.user.email)
    res.json(rows)
  } catch (err) {
    console.error('[user-settings GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /api/user-settings/:id ────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const row = stmts.getSettingsById.get(req.params.id)
    if (!row) return res.status(404).json({ error: 'Not found' })
    if (row.created_by !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(row)
  } catch (err) {
    console.error('[user-settings GET/:id]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /api/user-settings ───────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { binance_api_key, binance_api_secret, display_name } = req.body
    const id = generateId()
    stmts.createSettings.run(
      id,
      req.user.email,
      binance_api_key || null,
      binance_api_secret || null,
      display_name || null
    )
    const created = stmts.getSettingsById.get(id)
    res.status(201).json(created)
  } catch (err) {
    console.error('[user-settings POST]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── PUT /api/user-settings/:id ────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const existing = stmts.getSettingsById.get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (existing.created_by !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { binance_api_key, binance_api_secret, display_name } = req.body
    stmts.updateSettings.run(
      binance_api_key ?? existing.binance_api_key,
      binance_api_secret ?? existing.binance_api_secret,
      display_name ?? existing.display_name,
      req.params.id
    )
    const updated = stmts.getSettingsById.get(req.params.id)
    res.json(updated)
  } catch (err) {
    console.error('[user-settings PUT/:id]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── DELETE /api/user-settings/:id ────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const existing = stmts.getSettingsById.get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })
    if (existing.created_by !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    stmts.deleteSettings.run(req.params.id)
    res.status(204).end()
  } catch (err) {
    console.error('[user-settings DELETE/:id]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
