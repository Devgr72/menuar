import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

type Direction = 'up' | 'left' | 'right' | 'scale'

const OFFSET: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up:    { y: 28 },
  left:  { x: -40 },
  right: { x: 40 },
  scale: { scale: 0.94 },
}

interface Props {
  children: ReactNode
  direction?: Direction
  delay?: number
  className?: string
  /** Tag to render — keeps section semantics intact when wrapping headings or lists. */
  as?: 'div' | 'section' | 'li' | 'header'
}

/**
 * Scroll-triggered entrance animation. Animates once, and collapses to a plain
 * fade for visitors who ask for reduced motion.
 */
export default function Reveal({ children, direction = 'up', delay = 0, className, as = 'div' }: Props) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  const from = reduce ? {} : OFFSET[direction]

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  )
}
