/**
 * Login.jsx
 *
 * Handles both login and registration.
 * After success, redirects back to wherever the user was going (determined by):
 *   1. React Router location.state.from  (set by <RequireAuth> navigate)
 *   2. ?returnUrl= query param           (set by apiClient 401 interceptor)
 *   3. Fallback: "/"
 */
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login, register } from '@/api/auth'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getReturnPath(location) {
  // Priority 1: React Router state (set by <RequireAuth>)
  if (location.state?.from?.pathname) {
    return location.state.from.pathname
  }
  // Priority 2: ?returnUrl= query param (set by apiClient 401 redirect)
  const params = new URLSearchParams(location.search)
  const returnUrl = params.get('returnUrl')
  if (returnUrl) {
    try {
      // returnUrl may be a full URL — extract just the pathname
      const url = new URL(returnUrl, window.location.origin)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search
      }
    } catch {
      // returnUrl is already a pathname
      if (returnUrl.startsWith('/') && !returnUrl.startsWith('/login')) {
        return returnUrl
      }
    }
  }
  return '/'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshAuth } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const returnTo = getReturnPath(location)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, fullName)
      }
      await refreshAuth()
      navigate(returnTo, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Algo salió mal, intenta de nuevo'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-3xl font-mono font-medium text-foreground tracking-tighter mb-1">
            ◈ glorbi
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-[3px]">
            Institutional Analytics
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">

          {/* Tab switcher */}
          <div className="flex bg-secondary rounded-lg p-1">
            {[
              { key: 'login', label: 'Iniciar sesión' },
              { key: 'register', label: 'Registrarse' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setError(null) }}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all
                  ${mode === key
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Nombre completo
                </Label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>
            )}

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

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Contraseña
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="bg-secondary border-border font-mono text-sm"
              />
              {mode === 'register' && (
                <p className="text-[10px] font-mono text-muted-foreground/40">
                  Mínimo 6 caracteres
                </p>
              )}
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
              {loading
                ? (mode === 'login' ? 'Iniciando...' : 'Creando cuenta...')
                : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')
              }
            </Button>

          </form>
        </div>

        <p className="text-center text-[10px] font-mono text-muted-foreground/30 mt-6 tracking-wide">
          Solo lectura · Nunca ejecuta órdenes
        </p>
      </div>
    </div>
  )
}
