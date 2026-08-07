/**
 * Brand glyphs for the footer. lucide-react v1 dropped its brand icon set, so
 * these are inline paths sized to match the lucide icons used elsewhere.
 */
type GlyphProps = { className?: string }

export function FacebookGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.24-1.46 1.49-1.46H16.5V4.46A20 20 0 0 0 14.2 4.3c-2.29 0-3.85 1.4-3.85 3.96V10.5H8v3h2.35V21h3.15Z" />
    </svg>
  )
}

export function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.6" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LinkedinGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7.2 9.6H4.5V20h2.7V9.6ZM5.85 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM20 14.1c0-2.9-1.55-4.25-3.62-4.25-1.67 0-2.42.92-2.84 1.56V9.6H10.8V20h2.74v-5.8c0-1.23.23-2.42 1.75-2.42 1.5 0 1.52 1.4 1.52 2.5V20H20v-5.9Z" />
    </svg>
  )
}

export const SOCIAL_LINKS = [
  { label: 'Facebook',  href: '#', Glyph: FacebookGlyph },
  { label: 'Instagram', href: '#', Glyph: InstagramGlyph },
  { label: 'LinkedIn',  href: '#', Glyph: LinkedinGlyph },
]
