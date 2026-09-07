/**
 * ScrollReveal.jsx
 *
 * Wrapper que anima a sus hijos cuando entran al viewport.
 * Usa useInView de framer-motion para detectar visibilidad.
 *
 * Uso:
 *   <ScrollReveal>
 *     <MyComponent />
 *   </ScrollReveal>
 *
 * Props opcionales:
 *   - delay: retraso en segundos antes de iniciar la animación
 *   - direction: 'up' | 'down' | 'left' | 'right' — dirección del slide
 *   - distance: píxeles de desplazamiento inicial (default: 20)
 *   - once: si true (default), anima solo la primera vez
 */
import React, { createContext } from 'react'
import { motion, useInView } from 'framer-motion'

export const ScrollRevealContext = createContext(null)

const offsets = {
  up:    { y: 20 },
  down:  { y: -20 },
  left:  { x: 20 },
  right: { x: -20 },
}

export default function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 20,
  once = true,
  className,
}) {
  const ref = React.useRef(null)
  const isInView = useInView(ref, { once, margin: '-10px' })

  const offset = direction === 'up'    ? { y: distance }
               : direction === 'down'  ? { y: -distance }
               : direction === 'left'  ? { x: distance }
               : direction === 'right' ? { x: -distance }
               : { y: distance }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      <ScrollRevealContext.Provider value={isInView}>
        {children}
      </ScrollRevealContext.Provider>
    </motion.div>
  )
}
