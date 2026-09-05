import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export default function GlareHover({ children, className, glareColor = '#ffffff', glareOpacity = 0.14 }) {
  const elementRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 50, y: 50 })

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    })
  }

  return (
    <div
      ref={elementRef}
      className={cn('relative overflow-hidden', className)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 180px at ${position.x}% ${position.y}%, ${glareColor}${Math.round(glareOpacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
        }}
      />
      <div className="relative z-0 h-full">{children}</div>
    </div>
  )
}
