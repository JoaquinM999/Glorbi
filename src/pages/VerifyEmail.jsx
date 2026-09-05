/**
 * VerifyEmail.jsx
 *
 * Página donde el usuario llega desde el link de verificación del email.
 * Confirma automáticamente al cargar — no requiere acción del usuario.
 */
import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmail } from '@/api/auth'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Este link no es válido. Faltan datos necesarios.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Tu email fue verificado correctamente.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'El link es inválido o expiró.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-3xl font-mono font-medium text-foreground tracking-tighter mb-6">
          glorbi
        </div>

        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
              <p className="text-sm font-mono text-muted-foreground">Verificando...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="w-10 h-10 text-green" />
              <p className="text-sm font-mono text-foreground">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-10 h-10 text-red" />
              <p className="text-sm font-mono text-red">{message}</p>
            </>
          )}
        </div>

        <Link
          to="/"
          className="inline-block text-[11px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          Ir al Dashboard
        </Link>
      </div>
    </div>
  )
}
