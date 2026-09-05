const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { db, stmts } = require('../db/database')

const router = express.Router()
router.use(authMiddleware)

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin_required' })
  next()
}

router.use(requireAdmin)

router.get('/', (_req, res) => {
  res.json(stmts.getAllUsers.all())
})

router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'cannot_delete_self', message: 'No puedes eliminar tu propia cuenta admin' })
  }
  const user = stmts.getUserById.get(req.params.id)
  if (!user) return res.status(404).json({ error: 'user_not_found' })

  try {
    db.transaction(() => {
      stmts.deleteUserSettingsByOwner.run(user.email)
      stmts.deleteUserTokensByUser.run(user.id)
      stmts.deleteUserFeedback.run(user.email)
      stmts.deleteUserXSubscriptions.run(user.email)
      stmts.deleteUserIolPositions.run(user.email)
      stmts.deleteUserIolTransactions.run(user.email)
      stmts.deleteUserPortfolioHistory.run(user.email)
      stmts.deleteUser.run(user.id)
    })()
    res.status(204).end()
  } catch (error) {
    console.error('[admin users DELETE]', error)
    res.status(500).json({ error: 'delete_user_failed' })
  }
})

module.exports = router