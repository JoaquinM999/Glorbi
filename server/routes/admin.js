/**
 * admin.js
 *
 * Rutas para funciones administrativas — solo accesibles si role='admin'
 *  - GET  /admin/users                    → listar todos los usuarios
 *  - POST /admin/users                    → crear usuario manualmente
 *  - GET  /admin/users/:id                → obtener datos de usuario
 *  - PATCH /admin/users/:id               → editar usuario (email, nombre, rol, etc)
 *  - DELETE /admin/users/:id              → eliminar usuario
 *  - PATCH /admin/users/:id/password      → cambiar contraseña de usuario
 *  - GET  /admin/users/:id/credentials    → ver credenciales (Binance, etc)
 *  - DELETE /admin/users/:id/credentials  → desconectar credenciales
 *  - GET  /admin/stats                    → estadísticas del sistema
 */
const express = require('express')
const bcrypt = require('bcryptjs')
const { db, stmts, generateId, generateToken } = require('../db/database')
const authMiddleware = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/rateLimiters')

const router = express.Router()

// ── Middleware: verificar que es admin ─────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Aplicar auth a todas las rutas admin
router.use(authMiddleware, requireAdmin)

// ── GET /admin/users ──────────────────────────────────────────────────────
// Listar todos los usuarios
router.get('/users', (req, res) => {
  try {
    const users = stmts.getAllUsers.all()
    const safe = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      email_verified: u.email_verified,
      created_at: u.created_at,
      has_binance_keys: !!u.binance_api_key, // booleano si tiene claves
    }))
    res.json(safe)
  } catch (err) {
    console.error('[admin/users GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── POST /admin/users ─────────────────────────────────────────────────────
// Crear usuario manualmente
router.post('/users', authLimiter, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email y password requeridos' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' })
    }

    const existing = stmts.getUserByEmail.get(email.toLowerCase())
    if (existing) {
      return res.status(409).json({ error: 'Email ya registrado' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const id = generateId()
    const userRole = role && ['admin', 'user'].includes(role) ? role : 'user'

    stmts.createUser.run(id, email.toLowerCase(), full_name || null, hashed, userRole)
    const user = stmts.getUserById.get(id)

    const { password: _pw, ...safeUser } = user
    res.status(201).json({ user: safeUser, message: 'Usuario creado por admin' })
  } catch (err) {
    console.error('[admin/users POST]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /admin/users/:id ──────────────────────────────────────────────────
// Obtener datos de un usuario específico
router.get('/users/:id', (req, res) => {
  try {
    const user = stmts.getUserById.get(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const { password: _pw, ...safeUser } = user
    res.json(safeUser)
  } catch (err) {
    console.error('[admin/users/:id GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── PATCH /admin/users/:id ───────────────────────────────────────────────
// Editar usuario (email, nombre, rol, verificación de email)
router.patch('/users/:id', async (req, res) => {
  try {
    const { email, full_name, role, email_verified } = req.body
    const user = stmts.getUserById.get(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Validar email único si se cambia
    if (email && email.toLowerCase() !== user.email) {
      const existing = stmts.getUserByEmail.get(email.toLowerCase())
      if (existing) {
        return res.status(409).json({ error: 'Email ya registrado' })
      }
    }

    // Preparar updates
    let updates = {}
    if (email) updates.email = email.toLowerCase()
    if (full_name !== undefined) updates.full_name = full_name
    if (role && ['admin', 'user'].includes(role)) updates.role = role
    if (email_verified !== undefined) updates.email_verified = email_verified ? 1 : 0

    // Ejecutar update
    if (Object.keys(updates).length > 0) {
      const cols = Object.keys(updates).map(k => `${k} = ?`)
      const vals = Object.values(updates)
      const sql = `UPDATE users SET ${cols.join(', ')} WHERE id = ?`
      db.prepare(sql).run(...vals, req.params.id)
    }

    const updated = stmts.getUserById.get(req.params.id)
    const { password: _pw, ...safeUser } = updated
    res.json({ user: safeUser, message: 'Usuario actualizado' })
  } catch (err) {
    console.error('[admin/users/:id PATCH]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── DELETE /admin/users/:id ───────────────────────────────────────────────
// Eliminar usuario
router.delete('/users/:id', (req, res) => {
  try {
    const user = stmts.getUserById.get(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // No permitir eliminar al propio admin
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' })
    }

    // Eliminar datos del usuario en cascada
    db.prepare('DELETE FROM user_settings WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(req.params.id)
    db.prepare('DELETE FROM feedback WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM x_subscriptions WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM iol_positions WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM iol_transactions WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM portfolio_daily_history WHERE created_by = ?').run(user.email)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)

    res.json({ message: 'Usuario eliminado' })
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── PATCH /admin/users/:id/password ───────────────────────────────────────
// Cambiar contraseña de un usuario
router.patch('/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' })
    }

    const user = stmts.getUserById.get(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const hashed = await bcrypt.hash(password, 10)
    stmts.updatePassword.run(hashed, req.params.id)

    res.json({ message: 'Contraseña actualizada' })
  } catch (err) {
    console.error('[admin/users/:id/password PATCH]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /admin/users/:id/credentials ──────────────────────────────────────
// Ver credenciales del usuario (sin revelar claves completas)
router.get('/users/:id/credentials', (req, res) => {
  try {
    const user = stmts.getUserById.get(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Obtener credenciales desde user_settings
    const settings = stmts.getSettingsByOwner.get(user.email)
    
    const creds = {
      binance: {
        has_keys: !!(settings && settings.binance_api_key),
        masked_key: (settings && settings.binance_api_key) 
          ? settings.binance_api_key.substring(0, 4) + '...' 
          : null,
      },
    }

    res.json(creds)
  } catch (err) {
    console.error('[admin/users/:id/credentials GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── DELETE /admin/users/:id/credentials ───────────────────────────────────
// Desconectar credenciales (eliminar claves Binance)
router.delete('/users/:id/credentials', (req, res) => {
  try {
    const user = stmts.getUserById.get(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Obtener settings del usuario
    const settings = stmts.getSettingsByOwner.get(user.email)
    if (!settings) {
      return res.status(404).json({ error: 'No hay credenciales para eliminar' })
    }

    // Actualizar credenciales (setearlas a NULL)
    db.prepare(
      'UPDATE user_settings SET binance_api_key = NULL, binance_api_secret = NULL WHERE id = ?'
    ).run(settings.id)

    res.json({ message: 'Credenciales eliminadas' })
  } catch (err) {
    console.error('[admin/users/:id/credentials DELETE]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /admin/stats ──────────────────────────────────────────────────────
// Estadísticas del sistema
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count
    const admins = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "admin"').get().count
    const usersVerified = db.prepare('SELECT COUNT(*) as count FROM users WHERE email_verified = 1').get().count
    const usersWithBinance = db.prepare('SELECT COUNT(DISTINCT created_by) as count FROM user_settings WHERE binance_api_key IS NOT NULL').get().count

    res.json({
      total_users: totalUsers,
      admins,
      verified_emails: usersVerified,
      users_with_binance: usersWithBinance,
    })
  } catch (err) {
    console.error('[admin/stats GET]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
