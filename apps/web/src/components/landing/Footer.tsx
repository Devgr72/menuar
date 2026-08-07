import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FOOTER_COLUMNS } from '../../constants/landing'
import { subscribeToNewsletter } from '../../api/client'
import { SOCIAL_LINKS } from './ui/SocialIcons'

export default function Footer() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = new FormData(form).get('email')
    if (typeof email !== 'string') return

    setStatus('sending')
    try {
      const { alreadySubscribed } = await subscribeToNewsletter(email)
      setStatus('done')
      setMessage(alreadySubscribed ? "You're already subscribed." : "You're on the list!")
      form.reset()
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Could not subscribe. Please try again.')
    }
  }

  return (
    <footer className="bg-dd-navy text-white">
      <div className="dd-container py-14 lg:py-16">
        {/* Two link columns sit side by side even on phones; the brand block and
            newsletter span the full width above and below them. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr] lg:gap-10">
          {/* Brand */}
          {/* Centred while it spans the full width; left-aligned once it is a column */}
          <div className="col-span-2 text-center lg:col-span-1 lg:text-left">
            <img
              src="/images/logo-light.png"
              alt="DishDekho"
              className="mx-auto h-[58px] w-auto lg:mx-0"
            />
            <p className="mx-auto mt-5 max-w-[300px] text-[13px] leading-[1.85] text-white/60 lg:mx-0 lg:max-w-[280px]">
              Empowering restaurants with AR Menu and Digital Menu to deliver exceptional dining
              experiences.
            </p>
            <ul className="mt-6 flex justify-center gap-3 lg:justify-start">
              {SOCIAL_LINKS.map(({ label, href, Glyph }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white/70 transition-all duration-200 hover:border-dd-orange hover:bg-dd-orange hover:text-white"
                  >
                    <Glyph className="h-[17px] w-[17px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-poppins text-[15px] font-bold text-white">{column.title}</h3>
              <ul className="mt-5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-[13px] text-white/60 transition-colors hover:text-dd-orange"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-[13px] text-white/60 transition-colors hover:text-dd-orange"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Newsletter */}
          <div className="col-span-2 text-center lg:col-span-1 lg:text-left">
            <h3 className="font-poppins text-[15px] font-bold text-white">Newsletter</h3>
            <p className="mt-5 text-[13px] leading-[1.85] text-white/60">
              Subscribe to get updates
              <br />
              and latest offers.
            </p>
            <form onSubmit={onSubscribe} className="mx-auto mt-4 max-w-[280px] space-y-3 lg:mx-0 lg:max-w-[260px]">
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                aria-label="Email address"
                className="h-11 w-full rounded-btn bg-white px-4 text-[13px] text-dd-ink placeholder:text-[#9AA5B4] focus:outline-none focus:ring-2 focus:ring-dd-orange"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="h-11 w-full rounded-btn bg-dd-orange font-poppins text-[14px] font-semibold text-white transition-colors hover:bg-dd-orange-dk disabled:opacity-60"
              >
                {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
              </button>
              {message && (
                <p
                  role={status === 'error' ? 'alert' : 'status'}
                  className={`text-[12px] font-medium ${
                    status === 'error' ? 'text-[#FF8A8A]' : 'text-dd-orange'
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="dd-container flex flex-col items-center justify-between gap-3 py-5 text-[12px] text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} DishDekho. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-dd-orange">
              Privacy Policy
            </Link>
            <span className="text-white/20">|</span>
            <Link to="/terms" className="transition-colors hover:text-dd-orange">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
