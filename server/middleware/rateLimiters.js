/**
 * rateLimiters.js
 *
 * Distintos límites según qué tan sensible/costosa es cada ruta:
 *
 *  - authLimiter:     login/register — el más estricto, previene fuerza
 *                      bruta de contraseñas y spam de cuentas nuevas.
 *  - binanceTestLimiter: /api/binance/test — hace una llamada real a
 *                      Binance por cada request, hay que cuidar eso.
 *  - feedbackLimiter: evita que alguien spamee el buzón de reportes.
 *  - generalLimiter:  red de seguridad general para el resto de la API.
 *
 * Todos identifican al cliente por IP. Si el server corre detrás de un
 * proxy (Render, Vercel, etc.), index.js configura `trust proxy` para
 * que la IP real del cliente se lea correctamente y no la del proxy.
 */
const rateLimit = require('express-rate-limit')

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ error: 'rate_limited', message })
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15,                  // 15 intentos de login/registro cada 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Demasiados intentos. Esperá unos minutos antes de volver a intentar.'),
})

const binanceTestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutos
  max: 10,                  // 10 pruebas de conexión cada 5 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Demasiadas pruebas de conexión seguidas. Esperá un momento.'),
})

const iolTestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Demasiadas pruebas de conexión IOL. Esperá unos minutos.'),
})

const iolSyncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Demasiadas sincronizaciones IOL. Esperá un momento.'),
})

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,                  // 20 reportes por hora por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Enviaste demasiados reportes. Probá de nuevo más tarde.'),
})

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,                 // 300 requests cada 15 min por IP — generoso para uso normal
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Demasiadas solicitudes. Esperá un momento e intentá de nuevo.'),
})

module.exports = { authLimiter, binanceTestLimiter, iolTestLimiter, iolSyncLimiter, feedbackLimiter, generalLimiter }
