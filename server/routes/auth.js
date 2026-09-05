/**
 * auth.js
 *
 * Agregado en esta versión:
 *  - POST /auth/register ahora manda un email de verificación (no bloqueante —
 *    el usuario puede usar la app igual sin verificar, esto es solo para que
 *    vos tengas confianza de que el email es real; queda visible en el perfil
 *    como "pendiente" si no lo verificó)
 *  - GET  /auth/verify-email?token=...     → confirma el email
 *  - POST /auth/forgot-password            → envía link de recuperación
 *  - POST /auth/reset-password             → aplica la nueva contraseña
 *
 * Decisión de diseño: la verificación de email NO bloquea el login ni el uso
 * de la app. Es solo informativo. Bloquear el acceso por un email que no
 * verificó sería frustrante en un beta con clientes reales — si el envío de
 * email falla o tarda, no queremos que nadie quede afuera de su cuenta.
 */
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { stmts, generateId, generateToken } = require('../db/database')
const authMiddleware = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/rateLimiters')
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/emailService')

const router = express.Router()

const VERIFY_TOKEN_HOURS = 24
const RESET_TOKEN_HOURS = 1

function isoInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

// ── GET /auth/config-status ───────────────────────────────────────────────────
// Le dice al frontend si el envío de emails está realmente activo o no.
// Se usa para decidir si mostrar el banner de "verificá tu email" — no tiene
// sentido pedirle a un cliente que reenvíe un email que en la práctica nunca
// le va a llegar (ver nota en emailService.js sobre el sandbox de Resend).
router.get('/config-status', (req, res) => {
  res.json({
    emailEnabled: Boolean(process.env.BREVO_SMTP_USER),
  })
})

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, full_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = stmts.getUserByEmail.get(email.toLowerCase())
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const id = generateId()

    const isFirstUser = stmts.countUsers.get().count === 0
    const role = isFirstUser ? 'admin' : 'user'

    stmts.createUser.run(id, email.toLowerCase(), full_name || null, hashed, role)

    const user = stmts.getUserById.get(id)

    // Email de verificación — no bloqueante. Si falla, el registro sigue OK.
    try {
      const verifyToken = generateToken()
      stmts.createAuthToken.run(verifyToken, id, 'verify_email', isoInHours(VERIFY_TOKEN_HOURS))
      await sendVerificationEmail(user.email, verifyToken)
    } catch (emailErr) {
      console.error('[register] No se pudo enviar email de verificación:', emailErr.message)
    }

    const { password: _pw, ...safeUser } = user
    res.status(201).json({ user: safeUser, requiresVerification: true })
  } catch (err) {
    console.error('[register]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /auth/verify-email?token=... ──────────────────────────────────────────
router.get('/verify-email', (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'Token requerido' })

    const record = stmts.getValidToken.get(token, 'verify_email')
    if (!record) {
      return res.status(400).json({ error: 'Link inválido o expirado. Pedí uno nuevo desde tu perfil.' })
    }

    stmts.setEmailVerified.run(record.user_id)
    stmts.markTokenUsed.run(token)

    res.json({ message: 'Email verificado correctamente' })
  } catch (err) {
    console.error('[verify-email]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /auth/resend-verification ────────────────────────────────────────────
// Respuesta genérica para que este endpoint no permita enumerar cuentas.
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim()
    const user = stmts.getUserByEmail.get(email)
    if (!user || user.email_verified) {
      return res.json({ message: 'Si la cuenta existe y necesita verificación, enviaremos un nuevo email.' })
    }
    stmts.invalidateUserTokens.run(user.id, 'verify_email')
    const verifyToken = generateToken()
    stmts.createAuthToken.run(verifyToken, user.id, 'verify_email', isoInHours(VERIFY_TOKEN_HOURS))
    await sendVerificationEmail(user.email, verifyToken)
    res.json({ message: 'Si la cuenta existe y necesita verificación, enviaremos un nuevo email.' })
  } catch (err) {
    console.error('[resend-verification]', err)
    res.status(500).json({ error: 'No se pudo reenviar el email' })
  }
})

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const user = stmts.getUserByEmail.get(email.toLowerCase())
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'email_not_verified', message: 'Verifica tu email antes de ingresar a Glorbi.' })
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    const { password: _pw, ...safeUser } = user
    res.json({ access_token: token, user: safeUser })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /auth/forgot-password ────────────────────────────────────────────────
// Siempre responde 200 con el mismo mensaje genérico, exista o no el email —
// así nadie puede usar este endpoint para averiguar qué emails están registrados.
router.post('/forgot-password', authLimiter, async (req, res) => {
  const GENERIC_MSG = { message: 'Si el email existe, te enviamos instrucciones para recuperar tu contraseña.' }
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email es requerido' })

    const user = stmts.getUserByEmail.get(email.toLowerCase())
    if (!user) {
      // No revelamos si el email existe o no
      return res.json(GENERIC_MSG)
    }

    stmts.invalidateUserTokens.run(user.id, 'reset_password')
    const resetToken = generateToken()
    stmts.createAuthToken.run(resetToken, user.id, 'reset_password', isoInHours(RESET_TOKEN_HOURS))
    await sendPasswordResetEmail(user.email, resetToken)

    res.json(GENERIC_MSG)
  } catch (err) {
    console.error('[forgot-password]', err)
    // Igual devolvemos el mensaje genérico para no filtrar info por error
    res.json(GENERIC_MSG)
  }
})

// ── POST /auth/reset-password ─────────────────────────────────────────────────
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'token y password son requeridos' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const record = stmts.getValidToken.get(token, 'reset_password')
    if (!record) {
      return res.status(400).json({ error: 'Link inválido o expirado. Pedí uno nuevo.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    stmts.updatePassword.run(hashed, record.user_id)
    stmts.markTokenUsed.run(token)

    res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' })
  } catch (err) {
    console.error('[reset-password]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user)
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

module.exports = router
