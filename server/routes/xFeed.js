const express = require('express')
const axios = require('axios')
const authMiddleware = require('../middleware/authMiddleware')
const { stmts, generateId } = require('../db/database')

const router = express.Router()
router.use(authMiddleware)

function cleanHandle(value) {
  return String(value || '').replace(/^@/, '').trim()
}

router.get('/', async (req, res) => {
  const subscriptions = stmts.getXSubscriptionsByOwner.all(req.user.email)
  const handles = subscriptions.map((item) => item.handle)
  const token = process.env.X_BEARER_TOKEN

  if (!token || handles.length === 0) {
    return res.json({ configured: Boolean(token), subscriptions: handles, tweets: [] })
  }

  try {
    const users = await Promise.all(handles.map(async (handle) => {
      const { data } = await axios.get('https://api.x.com/2/users/by/username/' + handle, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 'user.fields': 'name,username,profile_image_url' },
        timeout: 10000,
      })
      return data.data
    }))
    const tweets = (await Promise.all(users.map(async (user) => {
      const { data } = await axios.get(`https://api.x.com/2/users/${user.id}/tweets`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          max_results: 10,
          'tweet.fields': 'created_at,public_metrics,lang',
          expansions: 'author_id',
          'user.fields': 'name,username,profile_image_url',
          exclude: 'retweets,replies',
        },
        timeout: 10000,
      })
      return (data.data || []).map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        date: tweet.created_at,
        link: `https://x.com/${user.username}/status/${tweet.id}`,
        source: user.name || user.username,
        handle: user.username,
        profileImage: user.profile_image_url || '',
      }))
    }))).flat().sort((a, b) => new Date(b.date) - new Date(a.date))

    res.json({ configured: true, subscriptions: handles, tweets: tweets.slice(0, 50) })
  } catch (err) {
    console.error('[x-feed]', err.response?.data || err.message)
    res.status(502).json({ error: 'x_feed_error', message: 'No se pudieron cargar las publicaciones de X' })
  }
})

router.post('/', (req, res) => {
  const handle = cleanHandle(req.body.handle)
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return res.status(400).json({ error: 'invalid_handle', message: 'Ingresa un usuario de X válido' })
  }
  try {
    stmts.createXSubscription.run(generateId(), req.user.email, handle)
    res.status(201).json({ handle })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'already_subscribed' })
    }
    console.error('[x-feed POST]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:handle', (req, res) => {
  stmts.deleteXSubscription.run(req.user.email, cleanHandle(req.params.handle))
  res.status(204).end()
})

module.exports = router