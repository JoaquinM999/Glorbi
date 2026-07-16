/**
 * Sidebar.jsx
 *
 * Rediseño de la marca superior del sidebar:
 *  - Antes: texto "◈ glorbi" duplicado con el del header (AppLayout).
 *  - Ahora: una marca geométrica animada (rombo con gradiente y rotación
 *    sutil continua) — más profesional, sin repetir texto, y con movimiento
 *    como pediste. Funciona igual colapsado o expandido.
 */
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Activity,
  Newspaper,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
} from 'lucide-react'
import { logout } from '@/api/auth'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/market-pulse', label: 'Market Pulse', icon: Activity },
  { path: '/news', label: 'News & Signals', icon: Newspaper },
  { path: '/screener', label: 'Screener', icon: BarChart3 },
]

/**
 * Marca animada: rombo con gradiente que gira lentamente y pulsa.
 * Reemplaza el texto "glorbi" que se repetía acá y en el header.
 */
function AnimatedMark({ size = 28 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <linearGradient id="markGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <motion.rect
          x="8" y="8" width="24" height="24"
          rx="4"
          transform="rotate(45 20 20)"
          fill="none"
          stroke="url(#markGradient)"
          strokeWidth="2.5"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.svg>
      {/* Punto central estático que da sensación de "core" fijo mientras el marco gira */}
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-green"
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

export default function Sidebar({ collapsed, onToggle, user }) {
  const location = useLocation()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border"
    >
      {/* Marca — animada, sin texto duplicado */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <AnimatedMark size={collapsed ? 22 : 26} />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[2px] whitespace-nowrap overflow-hidden"
              >
                Portfolio
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-secondary border border-border">
          <div className="text-sm font-mono text-foreground truncate">
            {user.full_name || user.email}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-green">
              {user.role === 'admin' ? 'ADMIN' : 'USER'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-150
                ${isActive
                  ? 'bg-sidebar-accent text-foreground border border-border'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border border-transparent'
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all border border-transparent"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Ajustes</span>}
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-red hover:bg-red/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Salir</span>}
        </button>
        {!collapsed && (
          <p className="px-3 pt-2 text-[10px] font-mono text-muted-foreground/40 tracking-wide">
            Solo lectura · Nunca ejecuta órdenes
          </p>
        )}
      </div>
    </motion.aside>
  )
}
