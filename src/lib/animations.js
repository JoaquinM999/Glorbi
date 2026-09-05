/**
 * animations.js
 *
 * Sistema centralizado de animaciones con dos niveles de intensidad:
 *
 *  - BOLD:   para pantallas con poco contenido (login, estados vacíos,
 *            landing) — movimiento notorio, con más duración y desplazamiento,
 *            para causar impacto visual sin competir con datos.
 *
 *  - SUBTLE: para pantallas densas en información (Dashboard, Screener,
 *            tablas, Market Pulse) — movimiento breve y de poca amplitud,
 *            que da sensación de "vivo" sin distraer de los números.
 *
 * Uso:
 *   import { pageBold, pageSubtle, staggerContainer, staggerItem } from '@/lib/animations'
 *   <motion.div {...pageBold}>...</motion.div>
 */

// ── Transiciones de página completas ──────────────────────────────────────────

export const pageBold = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.98 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

export const pageSubtle = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

// ── Entrada escalonada de listas/grids de cards ───────────────────────────────
// Uso: <motion.div variants={staggerContainer} initial="hidden" animate="show">
//        <motion.div variants={staggerItemBold|staggerItemSubtle}>...

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

export const staggerItemBold = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const staggerItemSubtle = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

// ── Micro-interacciones reutilizables ─────────────────────────────────────────

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98 },
}

export const hoverGlow = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
}

// Fade simple para textos/números que cambian (ej. valores del dashboard
// actualizándose) — muy sutil, no debe llamar la atención por sí solo.
export const numberUpdate = {
  initial: { opacity: 0.4 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
}
