const jwt = require('jsonwebtoken')
const { stmts } = require('../db/database')

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' })
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = stmts.getUserById.get(payload.sub)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    // Attach user to request (without the hashed password)
    const { password: _pw, ...safeUser } = user
    req.user = safeUser
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
