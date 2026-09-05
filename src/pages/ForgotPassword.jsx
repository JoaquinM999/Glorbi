/**
 * ForgotPassword.jsx
 *
 * Página para pedir el link de recuperación de contraseña.
 * Siempre muestra el mismo mensaje de éxito, exista o no el email
 * (así lo hace el backend también) — evita filtrar qué emails están
 * registrados en el sistema.
 */
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, getConfigStatus } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [emailEnabled, setEmailEnabled] = useState(true)

  useEffect(() => {
    getConfigStatus()
      .then((data) => setEmailEnabled(data.emailEnabled))
      .catch(() => setEmailEnabled(true)) // si falla la consulta, no bloqueamos con un aviso incorrecto
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Algo salió mal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-mono font-medium text-foreground tracking-tighter mb-1">
            glorbi
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-[3px]">
            Institutional Analytics
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-green" />
              <p className="text-sm font-mono text-foreground">
                Si el email existe, te enviamos instrucciones para recuperar tu contraseña.
              </p>
              <p className="text-[11px] font-mono text-muted-foreground/50">
                Revisá tu bandeja de entrada (y spam, por las dudas).
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-mono font-medium text-foreground mb-1">
                  Recuperar contraseña
                </h2>
                <p className="text-[11px] font-mono text-muted-foreground/50">
                  Ingresá tu email y te mandamos un link para restablecerla.
                </p>
              </div>

              {!emailEnabled && (
                <div className="flex gap-2 px-3 py-2.5 rounded-md bg-yellow/5 border border-yellow/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-mono text-yellow/80 leading-relaxed">
                    El envío de emails está en modo de prueba — solo el email del administrador
                    va a recibir el link. Si sos otro usuario, contactá al admin directamente.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    autoComplete="email"
                    className="bg-secondary border-border font-mono text-sm"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-md bg-red/10 border border-red/20">
                    <p className="text-[11px] font-mono text-red">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-wider h-10"
                >
                  {loading ? 'Enviando...' : 'Enviar instrucciones'}
                </Button>
              </form>
            </>
          )}
        </div>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 mt-6 text-[11px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  )
}
