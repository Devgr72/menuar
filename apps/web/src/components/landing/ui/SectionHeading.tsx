import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface Props {
  /** Segments alternate plain → accent, matching the two-tone headings in the design. */
  children: ReactNode
  subtitle?: ReactNode
  className?: string
}

export default function SectionHeading({ children, subtitle, className = '' }: Props) {
  return (
    <div className={`text-center ${className}`}>
      <Reveal>
        <h2 className="font-poppins text-[28px] font-bold leading-tight text-dd-navy sm:text-[34px] lg:text-[40px]">
          {children}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.08}>
          <div className="mx-auto mt-4 max-w-[760px] text-[14px] leading-[1.85] text-dd-muted sm:text-[15px]">
            {subtitle}
          </div>
        </Reveal>
      )}
    </div>
  )
}

/** Orange highlight used inside section headings. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-dd-orange">{children}</span>
}
