/**
 * feedback.js
 *
 * Sistema simple de reportes/feedback para testing con clientes.
 * Cualquier usuario autenticado puede enviar un reporte (bug, sugerencia,
 * pregunta). Vos podés revisarlos con GET /api/feedback (ver nota abajo
 * sobre cómo restringir esto a admins más adelante si querés).
 */
const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { stmts, generateId } = require('../db/database')
const { sendFeedbackNotification } = require('../services/emailService')

const router = express.Router()
const { feedbackLimiter } = require('../middleware/rateLimiters')
router.use(authMiddleware)

const VALID_CATEGORIES = ['bug', 'sugerencia', 'pregunta', 'general']

// ── POST /api/feedback ────────────────────────────────────────────────────────
router.post('/', feedbackLimiter, async (req, res) => {
  try {
    const { category, message, page_url } = req.body

    if (!message || message.trim().length < 3) {
      return res.status(400).json({ error: 'El mensaje es muy corto' })
    }

    const cat = VALID_CATEGORIES.includes(category) ? category : 'general'
    const id = generateId()

    stmts.createFeedback.run(id, req.user.email, cat, message.trim(), page_url || null)

    console.log(`[feedback] Nuevo reporte de ${req.user.email} (${cat}): ${message.slice(0, 80)}`)

    // Notificación por email al admin — no bloqueante. Si ADMIN_EMAIL no está
    // configurado o el envío falla, el reporte ya quedó guardado igual.
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      sendFeedbackNotification(adminEmail, {
        category: cat,
        created_by: req.user.email,
        page_url,
        message: message.trim(),
      }).catch((err) => console.error('[feedback] Error enviando notificación:', err.message))
    }

    res.status(201).json({ id, message: 'Reporte enviado, ¡gracias!' })
  } catch (err) {
    console.error('[feedback POST]', err)
    res.status(500).json({ error: 'No se pudo enviar el reporte' })
  }
})

// ── GET /api/feedback ─────────────────────────────────────────────────────────
// Devuelve TODOS los reportes si sos admin, o solo los tuyos si no.
// Esto te permite revisar el feedback de todos tus clientes de prueba
// entrando vos mismo con tu cuenta (que tiene role='admin' si te registraste
// primero — ver nota en server/routes/auth.js sobre cómo se asigna el rol).
router.get('/', (req, res) => {
  try {
    const rows = req.user.role === 'admin'
      ? stmts.getAllFeedback.all()
      : stmts.getFeedbackByUser.all(req.user.email)
    res.json(rows)
  } catch (err) {
    console.error('[feedback GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── PATCH /api/feedback/:id ───────────────────────────────────────────────────
// Solo admin puede marcar un reporte como resuelto/en progreso.
router.patch('/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo admins pueden actualizar el estado' })
  }
  const { status } = req.body
  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' })
  }
  stmts.updateFeedbackStatus.run(status, req.params.id)
  res.json({ message: 'Actualizado' })
})

module.exports = router
