/**
 * FeedbackButton.jsx
 *
 * Botón "Reportar" en el header — llena el espacio que quedó vacío al sacar
 * el badge LIVE, y le da a tus clientes de prueba una forma directa de
 * mandarte bugs, sugerencias o preguntas sin salir de la app.
 */
import React, { useState } from 'react'
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import apiClient from '@/api/apiClient'

const CATEGORIES = [
  { value: 'bug',        label: 'Bug / Error' },
  { value: 'sugerencia', label: 'Sugerencia' },
  { value: 'pregunta',   label: 'Pregunta' },
  { value: 'general',    label: 'General' },
]

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (message.trim().length < 3) {
      setError('Escribí un poco más de detalle')
      return
    }
    setSending(true)
    setError(null)
    try {
      await apiClient.post('/api/feedback', {
        category,
        message,
        page_url: window.location.pathname,
      })
      setSent(true)
      setMessage('')
      setTimeout(() => {
        setOpen(false)
        setSent(false)
      }, 1800)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar, intentá de nuevo')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-[11px] font-mono uppercase tracking-wider"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Reportar
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !sending && setOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl"
            >
              {sent ? (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <CheckCircle2 className="w-10 h-10 text-green" />
                  <p className="text-sm font-mono text-foreground">¡Gracias! Ya lo recibimos.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-mono font-medium text-foreground">
                      Enviar reporte
                    </h2>
                    <button
                      onClick={() => setOpen(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mb-4 text-[10px] font-mono leading-relaxed text-muted-foreground/60">
                    Tu reporte se guarda de forma privada en Glorbi y se envía al email del administrador configurado.
                  </p>

                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider border transition-colors ${
                          category === c.value
                            ? 'bg-foreground text-background border-foreground'
                            : 'text-muted-foreground border-border hover:border-foreground/30'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Contanos qué pasó, qué esperabas ver, o qué te gustaría que agreguemos..."
                    rows={5}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />

                  {error && (
                    <p className="text-[11px] font-mono text-red mt-2">{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-foreground text-background rounded-lg py-2.5 text-xs font-mono uppercase tracking-wider hover:bg-foreground/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
