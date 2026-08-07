import { Link } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'outline' | 'navy' | 'white'
export type ButtonSize = 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-dd-orange text-white shadow-btn hover:bg-dd-orange-dk hover:shadow-[0_12px_28px_rgba(255,107,0,0.38)]',
  outline: 'bg-white text-dd-navy border border-dd-line hover:border-dd-orange hover:text-dd-orange',
  navy:    'bg-dd-navy text-white hover:bg-dd-navy-lt shadow-[0_10px_26px_rgba(15,39,71,0.28)]',
  white:   'bg-white text-dd-navy hover:bg-dd-soft',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-11 px-6 text-sm',
  lg: 'h-[52px] px-8 text-[15px]',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-btn font-poppins font-semibold ' +
  'transition-all duration-200 ease-out active:scale-[0.98] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dd-orange focus-visible:ring-offset-2 ' +
  'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none ' +
  'disabled:pointer-events-none disabled:opacity-60'

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}

function classes({ variant = 'primary', size = 'md', className = '' }: CommonProps) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`
}

/** Internal route button. */
export function ButtonLink({ to, ...props }: CommonProps & { to: string }) {
  return (
    <Link to={to} className={classes(props)}>
      {props.children}
    </Link>
  )
}

/** Same-page anchor button (smooth-scrolls to a section). */
export function ButtonAnchor({ href, ...props }: CommonProps & { href: string }) {
  return (
    <a href={href} className={classes(props)}>
      {props.children}
    </a>
  )
}

export default function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<'button'>) {
  return (
    <button {...rest} className={classes({ variant, size, className, children })}>
      {children}
    </button>
  )
}
