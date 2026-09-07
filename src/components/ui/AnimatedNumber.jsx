/**
 * AnimatedNumber.jsx
 *
 * Efecto "CountUp" — los números se animan desde 0 hasta el valor real.
 * Estilo Bloomberg terminal. Usa framer-motion useSpring para interpolación
 * suave con física de resorte.
 *
 * Acepta strings con formato como "$1,234.56", "45.2%", "1.09M", etc.
 * Extrae la parte numérica, la anima, y reconstituye el string con prefijo/sufijo.
 */
import React, { useEffect, useRef, useContext } from 'react'
import { useMotionValue, useTransform, motion, useInView, animate } from 'framer-motion'
import { ScrollRevealContext } from './ScrollReveal'

function parseFormattedNumber(str) {
  if (typeof str === 'number') return { prefix: '', number: str, suffix: '', decimals: 0 }
  const s = String(str)
  const match = s.match(/^(.*?)([-]?\d[\d,]*\.?\d*)(.*)$/)
  if (!match) return null
  const prefix = match[1]
  const raw = match[2].replace(/,/g, '')
  const number = parseFloat(raw)
  const decPart = raw.split('.')[1]
  const decimals = decPart ? decPart.length : 0
  const suffix = match[3]
  return { prefix, number, suffix, decimals }
}

function formatWithCommas(n, decimals) {
  const fixed = n.toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}

export default function AnimatedNumber({ value, duration = 1.2, className }) {
  const ref = useRef(null)
  const isScrollRevealInView = useContext(ScrollRevealContext)
  const isSelfInView = useInView(ref, { once: true, margin: '50px' })
  const isInView = isScrollRevealInView !== null ? isScrollRevealInView : isSelfInView
  const parsed = parseFormattedNumber(value)

  const motionValue = useMotionValue(0)

  const display = useTransform(motionValue, (v) => {
    if (!parsed) return String(value)
    return `${parsed.prefix}${formatWithCommas(v, parsed.decimals)}${parsed.suffix ? ' ' + parsed.suffix : ''}`
  })

  useEffect(() => {
    if (isInView && parsed) {
      animate(motionValue, parsed.number, {
        duration: duration,
        ease: 'easeOut'
      })
    }
  }, [isInView, parsed?.number, duration])

  if (!parsed) {
    return <span ref={ref} className={className}>{value}</span>
  }

  return <motion.span ref={ref} className={className}>{display}</motion.span>
}
