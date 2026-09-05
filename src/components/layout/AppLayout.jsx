/**
 * AppLayout.jsx
 *
 * Agregado: transición sutil entre páginas al navegar (Dashboard → Market
 * Pulse → Screener, etc.) usando AnimatePresence + useLocation como key.
 * Es sutil a propósito — estas son pantallas densas en datos, el movimiento
 * marcado queda reservado para login/landing.
 */
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import FeedbackButton from './FeedbackButton'
import VerificationBanner from './VerificationBanner'
import { pageSubtle } from '@/lib/animations'
import { useAuth } from '@/lib/AuthContext'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        user={user}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className={`transition-all duration-200 ease-in-out ml-0 ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        {/* Header bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-8 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-mono font-semibold text-foreground tracking-tight">
                glorbi
              </h1>
              <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-[3px] hidden sm:block">
                Institutional Portfolio Analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FeedbackButton />
            {user && (
              <span className="text-xs font-mono text-muted-foreground">
                {user.full_name || user.email}
              </span>
            )}
          </div>
        </header>

        {user && !user.email_verified && <VerificationBanner user={user} />}

        {/* Page content — con transición sutil al cambiar de ruta */}
        <div className="p-6 md:p-8 max-w-screen-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...pageSubtle}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
