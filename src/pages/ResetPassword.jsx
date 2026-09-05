/**
 * ResetPassword.jsx
 *
 * Página donde el usuario llega desde el link del email para elegir
 * una nueva contraseña. Lee el token de la URL (?token=...).
 */
import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'El link es inválido o expiró. Pedí uno nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm font-mono text-red">
            Este link no es válido. Faltan datos necesarios.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-[11px] font-mono text-muted-foreground hover:text-foreground underline"
          >
            Pedir un nuevo link
          </Link>
        </div>
      </div>
    )
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
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-green" />
              <p className="text-sm font-mono text-foreground">
                Contraseña actualizada. Redirigiendo...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-mono font-medium text-foreground">
                Elegí tu nueva contraseña
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Nueva contraseña
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="bg-secondary border-border font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Confirmar contraseña
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
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
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
