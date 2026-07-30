import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../../constants/landing'
import { useScrolled } from '../../hooks/useScrolled'
import { ButtonLink } from './ui/Button'

export default function Navbar() {
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header
      className={`sticky top-0 z-50 h-20 transition-all duration-300 ${
        scrolled
          ? 'border-b border-dd-line bg-white/85 shadow-soft backdrop-blur-xl'
          : 'border-b border-transparent bg-white'
      }`}
    >
      <nav className="dd-container flex h-20 items-center justify-between gap-6">
        <Link to="/" className="flex-none" aria-label="DishDekho home">
          <img
            src="/images/logo.png"
            alt="DishDekho"
            className="h-11 w-auto sm:h-[52px]"
            width={216}
            height={166}
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="font-poppins text-[15px] font-medium text-dd-ink transition-colors hover:text-dd-orange"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ButtonLink to="/sign-in" className="hidden sm:inline-flex">
            Get Started
          </ButtonLink>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-btn border border-dd-line text-dd-navy transition-colors hover:border-dd-orange hover:text-dd-orange lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-dd-navy/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-[340px] flex-col bg-white p-6 shadow-2xl lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-8 flex items-center justify-between">
                <img src="/images/logo.png" alt="DishDekho" className="h-11 w-auto" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-btn border border-dd-line text-dd-navy"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ul className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block border-b border-dd-line py-4 font-poppins text-[16px] font-medium text-dd-ink transition-colors hover:text-dd-orange"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <ButtonLink to="/sign-in" size="lg" className="mt-8 w-full">
                Get Started
              </ButtonLink>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
