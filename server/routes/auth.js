const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { stmts, generateId } = require('../db/database')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = stmts.getUserByEmail.get(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const id = generateId()
    stmts.createUser.run(id, email.toLowerCase(), full_name || null, hashed, 'user')

    const user = stmts.getUserById.get(id)
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    })

    const { password: _pw, ...safeUser } = user
    res.status(201).json({ access_token: token, user: safeUser })
  } catch (err) {
    console.error('[register]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
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

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user)
})

// ── POST /auth/logout ─────────────────────────────────────────────────────────
// JWT is stateless — invalidation happens client-side by deleting the token.
// If you need server-side invalidation, add a token blocklist here.
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

module.exports = router
