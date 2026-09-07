/**
 * GlareHover.jsx
 *
 * Efecto de brillo radial que sigue al cursor + inclinación 3D.
 * Al pasar el mouse sobre el componente:
 *  1. Un gradiente radial translúcido sigue al puntero (glare suave)
 *  2. El elemento se inclina hacia el cursor (tilt 3D)
 *
 * El overflow:hidden está en el div interior para que el tilt no
 * corte los bordes. El contenedor exterior solo aplica perspective.
 */
import React, { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

export default function GlareHover({
  children,
  className,
  glareColor = '#22C55E',
  glareOpacity = 0.08,
  tiltDeg = 8,
}) {
  const elementRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

  const handlePointerMove = useCallback((event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    setPosition({ x, y })

    const rotateY = ((x - 50) / 50) * tiltDeg
    const rotateX = ((50 - y) / 50) * tiltDeg
    setTilt({ rotateX, rotateY })
  }, [tiltDeg])

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false)
    setTilt({ rotateX: 0, rotateY: 0 })
  }, [])

  return (
    <div
      ref={elementRef}
      className="relative h-full w-full"
      style={{ perspective: '600px' }}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className={cn('overflow-hidden h-full w-full', className)}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.03)`
            : 'rotateX(0deg) rotateY(0deg) scale(1)',
          transition: 'transform 0.15s ease-out',
          transformOrigin: 'center center',
        }}
      >
        {/* Glare overlay — soft green gradient, large radius */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 300px at ${position.x}% ${position.y}%, ${glareColor}${Math.round(glareOpacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
          }}
        />
        <div className="relative z-0 h-full">{children}</div>
      </div>
    </div>
  )
}
