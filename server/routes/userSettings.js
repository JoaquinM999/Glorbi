/**
 * userSettings.js
 *
 * FIX DE SEGURIDAD: binance_api_key y binance_api_secret ahora se cifran
 * con AES-256-GCM (cryptoService.js) antes de tocar la base de datos.
 * Nunca se guarda texto plano en glorbi.db.
 *
 * Se descifran únicamente al devolverlos al dueño autenticado de la fila
 * (ya validado por ownership check), para que el frontend pueda mostrar
 * el valor actual en el formulario de Ajustes.
 */
const express = require('express')
const { stmts, generateId } = require('../db/database')
const authMiddleware = require('../middleware/authMiddleware')
const { encrypt } = require('../services/cryptoService')

const router = express.Router()
router.use(authMiddleware)

/**
 * Descifra los campos sensibles de una fila antes de enviarla al cliente.
 */
function decryptRow(row) {
  if (!row) return row
  return {
    ...row,
    binance_api_key:    row.binance_api_key ? 'configured' : null,
    binance_api_secret: row.binance_api_secret ? 'configured' : null,
    iol_configured: Boolean(row.iol_username && row.iol_password),
    iol_username: row.iol_username ? 'configured' : null,
    iol_password: undefined,
  }
}

// ── GET /api/user-settings?created_by=email ───────────────────────────────────
router.get('/', (req, res) => {
  try {
    const rows = stmts.getSettingsByOwner.all(req.user.email)
    res.json(rows.map(decryptRow))
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
    res.json(decryptRow(row))
  } catch (err) {
    console.error('[user-settings GET/:id]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /api/user-settings ───────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { binance_api_key, binance_api_secret, iol_username, iol_password, display_name } = req.body
    const id = generateId()
    stmts.createSettings.run(
      id,
      req.user.email,
      binance_api_key ? encrypt(binance_api_key) : null,
      binance_api_secret ? encrypt(binance_api_secret) : null,
      iol_username ? encrypt(iol_username) : null,
      iol_password ? encrypt(iol_password) : null,
      display_name || null
    )
    const created = stmts.getSettingsById.get(id)
    res.status(201).json(decryptRow(created))
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

    const { binance_api_key, binance_api_secret, iol_username, iol_password, display_name } = req.body
    stmts.updateSettings.run(
      binance_api_key ? encrypt(binance_api_key) : existing.binance_api_key,
      binance_api_secret ? encrypt(binance_api_secret) : existing.binance_api_secret,
      iol_username ? encrypt(iol_username) : existing.iol_username,
      iol_password ? encrypt(iol_password) : existing.iol_password,
      display_name ?? existing.display_name,
      req.params.id
    )
    const updated = stmts.getSettingsById.get(req.params.id)
    res.json(decryptRow(updated))
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
