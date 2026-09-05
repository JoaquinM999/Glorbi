/**
 * VerificationBanner.jsx
 *
 * Solo se muestra si el backend confirma que el envío de emails está
 * realmente activo (RESEND_API_KEY configurada). Si no lo está —como
 * es tu caso hoy, sin dominio propio verificado en Resend— este banner
 * no aparece nunca, para no prometerle al usuario un "reenviar
 * verificación" que en la práctica no le va a llegar a nadie salvo
 * a la cuenta del dueño de Resend.
 *
 * Cuando en el futuro compres un dominio y lo conectes a Resend, esto
 * se activa solo — no hace falta tocar nada de este archivo.
 */
import React, { useState, useEffect } from 'react'
import { resendVerification, getConfigStatus } from '@/api/auth'
import { Mail, X } from 'lucide-react'

export default function VerificationBanner({ user }) {
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('verify_banner_dismissed') === '1'
  )
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    getConfigStatus()
      .then((data) => setEmailEnabled(data.emailEnabled))
      .catch(() => setEmailEnabled(false))
  }, [])

  if (!emailEnabled || dismissed || sent) return null

  const handleDismiss = () => {
    sessionStorage.setItem('verify_banner_dismissed', '1')
    setDismissed(true)
  }

  const handleResend = async () => {
    setSending(true)
    try {
      await resendVerification(user?.email)
      setSent(true)
    } catch {
      // Silencioso — no es crítico, el usuario puede reintentar
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-yellow/5 border-b border-yellow/15">
      <div className="flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-yellow/70 shrink-0" />
        <span className="text-[11px] font-mono text-yellow/80">
          Tu email no está verificado.
        </span>
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-[11px] font-mono text-yellow underline hover:no-underline disabled:opacity-50"
        >
          {sending ? 'Enviando...' : 'Reenviar verificación'}
        </button>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground/40 hover:text-muted-foreground shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
