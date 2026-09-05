/**
 * Login.jsx
 *
 * Video de fondo en loop (sin sonido, sin controles), con overlay oscuro
 * para mantener legibilidad, y animaciones "bold" (marcadas) de entrada —
 * esta es una pantalla con poco contenido, así que el movimiento puede
 * ser notorio sin competir con datos.
 *
 * Video: /public/login-bg.mp4 (optimizado: 1080p, sin audio, 1.9MB,
 * +faststart para reproducción progresiva). Poster: login-bg-poster.jpg
 * (primer frame del video, se muestra mientras el video carga — evita el
 * flash en blanco/negro al entrar a la página).
 *
 * Si el archivo llegara a faltar o fallar la carga, el fondo cae
 * automáticamente a un gradiente animado (VideoBackgroundFallback) — así
 * la página nunca se ve rota.
 */
import React, { useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login, register, resendVerification } from '@/api/auth'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getReturnPath(location) {
  if (location.state?.from?.pathname) {
    return location.state.from.pathname
  }
  const params = new URLSearchParams(location.search)
  const returnUrl = params.get('returnUrl')
  if (returnUrl) {
    try {
      const url = new URL(returnUrl, window.location.origin)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search
      }
    } catch {
      if (returnUrl.startsWith('/') && !returnUrl.startsWith('/login')) {
        return returnUrl
      }
    }
  }
  return '/'
}

/**
 * Fondo de respaldo animado — se ve mientras el video no cargó o no existe
 * todavía. Gradiente en movimiento lento, sutil pero perceptible.
 */
function VideoBackgroundFallback() {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(120deg, #0a0a0a, #0d1f14, #0a0a0a, #0d1a1f)',
        backgroundSize: '300% 300%',
      }}
      animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshAuth } = useAuth()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState(null)
  const [verificationNotice, setVerificationNotice] = useState(null)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [activeVideo, setActiveVideo] = useState(0)
  const videoRefs = [useRef(null), useRef(null)]

  const returnTo = getReturnPath(location)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setVerificationNotice(null)
    setCanResend(false)
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        if (password !== passwordConfirmation) {
          setError('Las contraseñas no coinciden')
          return
        }
        await register(email, password, fullName)
        setVerificationNotice('Cuenta creada. Revisa tu email y verifica la cuenta antes de iniciar sesión.')
        setMode('login')
        setPassword('')
        setPasswordConfirmation('')
        return
      }
      await refreshAuth()
      navigate(returnTo, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Algo salió mal, intenta de nuevo'
      setError(msg)
      setCanResend(err.response?.data?.error === 'email_not_verified')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(email)
      setVerificationNotice('Si la cuenta necesita verificación, enviamos un nuevo email.')
      setError(null)
      setCanResend(false)
    } catch {
      setError('No se pudo reenviar el email. Intenta nuevamente en unos minutos.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex items-center justify-center px-4">

      {/* Fondo: video en loop, mudo, sin controles */}
      <div className="absolute inset-0">
        {!videoFailed && [0, 1].map((videoIndex) => (
          <video
            key={videoIndex}
            ref={videoRefs[videoIndex]}
            autoPlay={videoIndex === 0}
            muted
            playsInline
            poster="/login-bg-poster.jpg"
            onError={() => setVideoFailed(true)}
            onTimeUpdate={(event) => {
              const video = event.currentTarget
              if (
                videoIndex === activeVideo &&
                video.duration &&
                video.currentTime >= video.duration - 0.8
              ) {
                const nextVideo = (videoIndex + 1) % 2
                const next = videoRefs[nextVideo].current
                if (next) {
                  next.currentTime = 0
                  next.play().catch(() => {})
                  setActiveVideo(nextVideo)
                }
              }
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              activeVideo === videoIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src="/login-bg.mp4" type="video/mp4" />
          </video>
        ))}
        {videoFailed && <VideoBackgroundFallback />}

        {/* Overlay oscuro — asegura legibilidad del form sobre cualquier video */}
        <div className="absolute inset-0 bg-background/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/90" />
      </div>

      {/* Contenido — con animación de entrada notoria (pantalla con poco contenido) */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="text-3xl font-mono font-medium text-foreground tracking-tighter mb-1">
            glorbi
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-[3px]">
            Institutional Analytics
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-6 space-y-5 shadow-2xl"
        >

          {/* Tab switcher */}
          <div className="flex bg-secondary rounded-lg p-1 relative">
            {[
              { key: 'login', label: 'Iniciar sesión' },
              { key: 'register', label: 'Registrarse' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setError(null) }}
                className={`relative flex-1 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-colors z-10
                  ${mode === key ? 'text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
            {/* Indicador deslizante animado */}
            <motion.div
              className="absolute inset-y-1 w-[calc(50%-4px)] bg-foreground rounded-md"
              animate={{ x: mode === 'login' ? 4 : 'calc(100% + 4px)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
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
              </motion.div>
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

            {verificationNotice && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="px-3 py-2 rounded-md bg-green/10 border border-green/20">
                <p className="text-[11px] font-mono text-green">{verificationNotice}</p>
              </motion.div>
            )}

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
              {mode === 'login' && (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-[10px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Repetir contraseña
                </Label>
                <Input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3 py-2 rounded-md bg-red/10 border border-red/20"
              >
                <p className="text-[11px] font-mono text-red">{error}</p>
              </motion.div>
            )}

            {canResend && (
              <button type="button" onClick={handleResend} disabled={resending} className="text-[11px] font-mono text-yellow hover:text-foreground underline disabled:opacity-50">
                {resending ? 'Enviando verificación...' : 'Reenviar verificación'}
              </button>
            )}

            <motion.div whileTap={{ scale: 0.98 }}>
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
            </motion.div>

          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-[10px] font-mono text-muted-foreground/40 mt-6 tracking-wide"
        >
          Solo lectura · Nunca ejecuta órdenes
        </motion.p>
      </motion.div>
    </div>
  )
}
