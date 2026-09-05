/**
 * emailService.js
 *
 * Envío de emails vía SMTP de Brevo.
 *
 * Setup:
 *  1. Crear cuenta en brevo.com
 *  2. Generar una SMTP key
 *  3. Configurar BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER,
 *     BREVO_SMTP_PASS y EMAIL_FROM en server/.env
 *  4. Verificar el sender en Brevo para que el email salga correctamente.
 */
const nodemailer = require('nodemailer')

function getTransporter() {
  const host = process.env.BREVO_SMTP_HOST
  const port = Number(process.env.BREVO_SMTP_PORT || 587)
  const user = process.env.BREVO_SMTP_USER
  const pass = process.env.BREVO_SMTP_PASS

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

const FROM = process.env.EMAIL_FROM || 'Glorbi <noreply@brevo.com>'
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

/**
 * Envío genérico con fallback a console.log si no hay SMTP configurado.
 */
async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log('[email] BREVO_SMTP_* no configurado — email NO enviado.')
    console.log(`[email] Para: ${to} | Asunto: ${subject}`)
    return { sent: false, reason: 'not_configured' }
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    console.log(`[email] ✓ Enviado a ${to}: ${subject}`)
    return { sent: true }
  } catch (err) {
    console.error(`[email] ✗ Error enviando a ${to}:`, err.message)
    return { sent: false, reason: err.message }
  }
}

// ── Email de verificación de cuenta ───────────────────────────────────────────
async function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/verify-email?token=${token}`
  return sendEmail({
    to,
    subject: 'Verificá tu cuenta de Glorbi',
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ffffff;">
        <h2 style="letter-spacing: 2px;">◈ glorbi</h2>
        <p>Confirmá tu email para activar tu cuenta:</p>
        <a href="${link}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #ffffff; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Verificar mi cuenta
        </a>
        <p style="color: #888; font-size: 12px;">
          Si no creaste esta cuenta, ignorá este email.<br>
          Este link expira en 24 horas.
        </p>
      </div>
    `,
  })
}

// ── Email de recuperación de contraseña ───────────────────────────────────────
async function sendPasswordResetEmail(to, token) {
  const link = `${APP_URL}/reset-password?token=${token}`
  return sendEmail({
    to,
    subject: 'Recuperar contraseña — Glorbi',
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ffffff;">
        <h2 style="letter-spacing: 2px;">◈ glorbi</h2>
        <p>Pediste restablecer tu contraseña. Hacé click abajo para elegir una nueva:</p>
        <a href="${link}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #ffffff; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Restablecer contraseña
        </a>
        <p style="color: #888; font-size: 12px;">
          Si no pediste esto, ignorá este email — tu contraseña actual sigue siendo válida.<br>
          Este link expira en 1 hora.
        </p>
      </div>
    `,
  })
}

// ── Notificación de feedback nuevo (te llega a vos, el admin) ────────────────
async function sendFeedbackNotification(adminEmail, feedback) {
  return sendEmail({
    to: adminEmail,
    subject: `[Glorbi] Nuevo reporte: ${feedback.category}`,
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ffffff;">
        <h2 style="letter-spacing: 2px;">◈ glorbi</h2>
        <p><strong>Categoría:</strong> ${feedback.category}</p>
        <p><strong>De:</strong> ${feedback.created_by}</p>
        <p><strong>Página:</strong> ${feedback.page_url || 'N/A'}</p>
        <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin: 16px 0; white-space: pre-wrap;">
          ${feedback.message}
        </div>
      </div>
    `,
  })
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendFeedbackNotification,
}
