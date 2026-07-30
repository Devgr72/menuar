import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Mail, MapPin, Phone, Send, Tag, User } from 'lucide-react'
import { CONTACT_DETAILS } from '../../constants/landing'
import { submitContactInquiry } from '../../api/client'
import Reveal from './ui/Reveal'
import Button from './ui/Button'

interface ContactForm {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FIELD =
  'h-12 w-full rounded-btn border border-dd-line bg-white pl-10 pr-4 text-[14px] text-dd-ink ' +
  'placeholder:text-[#9AA5B4] transition-colors focus:border-dd-orange focus:outline-none ' +
  'focus:ring-2 focus:ring-dd-orange/15'

export default function ContactSection() {
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>()

  const onSubmit = handleSubmit(async (values) => {
    setSendError(null)
    try {
      await submitContactInquiry(values)
      setSent(true)
      reset()
    } catch (err) {
      setSent(false)
      setSendError(
        err instanceof Error ? err.message : 'Could not send your message. Please try again.',
      )
    }
  })

  const details = [
    { icon: Mail,   value: CONTACT_DETAILS.email,   href: `mailto:${CONTACT_DETAILS.email}` },
    { icon: MapPin, value: CONTACT_DETAILS.address, href: null },
  ]

  return (
    <section id="contact" className="dd-anchor dd-section">
      <div className="dd-container grid gap-12 lg:grid-cols-[minmax(0,34%)_minmax(0,66%)] lg:gap-14">
        {/* ── Details ────────────────────────────────────────────────────── */}
        <div>
          <Reveal direction="left">
            <div className="flex items-center gap-3">
              <span className="h-0.5 w-8 flex-none bg-dd-orange" />
              <h2 className="font-poppins text-[28px] font-bold text-dd-navy sm:text-[34px]">
                Contact <span className="text-dd-orange">Us</span>
              </h2>
              <span className="h-0.5 w-8 flex-none bg-dd-orange" />
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.08}>
            <p className="mt-6 text-[14px] leading-[1.9] text-dd-muted">
              Have questions or want to know more?
              <br />
              We&apos;d love to hear from you.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-5">
            {details.map(({ icon: Icon, value, href }, i) => (
              <Reveal as="li" key={value} direction="left" delay={0.14 + i * 0.07}>
                <div className="flex items-center gap-4">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-dd-orange-lt">
                    <Icon className="h-[18px] w-[18px] text-dd-orange" strokeWidth={1.8} />
                  </span>
                  {href ? (
                    <a href={href} className="text-[14px] text-dd-ink transition-colors hover:text-dd-orange">
                      {value}
                    </a>
                  ) : (
                    <span className="text-[14px] text-dd-ink">{value}</span>
                  )}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* ── Form ───────────────────────────────────────────────────────── */}
        <Reveal direction="right" delay={0.1}>
          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-card bg-white p-6 shadow-card sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={User} error={errors.name?.message}>
                <input
                  {...register('name', { required: 'Please enter your name' })}
                  className={FIELD}
                  placeholder="Your Name"
                  aria-label="Your Name"
                />
              </Field>

              <Field icon={Mail} error={errors.email?.message}>
                <input
                  {...register('email', {
                    required: 'Please enter your email',
                    pattern: { value: EMAIL_RE, message: 'Enter a valid email address' },
                  })}
                  type="email"
                  className={FIELD}
                  placeholder="Your Email"
                  aria-label="Your Email"
                />
              </Field>

              <Field icon={Phone} error={errors.phone?.message}>
                <input
                  {...register('phone', {
                    required: 'Please enter your phone number',
                    minLength: { value: 7, message: 'Enter a valid phone number' },
                  })}
                  type="tel"
                  className={FIELD}
                  placeholder="Phone Number"
                  aria-label="Phone Number"
                />
              </Field>

              <Field icon={Tag} error={errors.subject?.message}>
                <input
                  {...register('subject', { required: 'Please add a subject' })}
                  className={FIELD}
                  placeholder="Subject"
                  aria-label="Subject"
                />
              </Field>
            </div>

            <div className="mt-4">
              <textarea
                {...register('message', { required: 'Please write a message' })}
                rows={4}
                placeholder="Your Message"
                aria-label="Your Message"
                className="w-full resize-y rounded-btn border border-dd-line bg-white px-4 py-3 text-[14px] text-dd-ink placeholder:text-[#9AA5B4] transition-colors focus:border-dd-orange focus:outline-none focus:ring-2 focus:ring-dd-orange/15"
              />
              {errors.message && <ErrorText>{errors.message.message}</ErrorText>}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[190px]">
                {isSubmitting ? 'Sending…' : 'Send Message'}
                <Send className="h-4 w-4" />
              </Button>
              {sent && (
                <p role="status" className="text-[13px] font-medium text-[#1F9254]">
                  Thanks! We&apos;ll get back to you shortly.
                </p>
              )}
              {sendError && (
                <p role="alert" className="text-[13px] font-medium text-[#D93025]">
                  {sendError}
                </p>
              )}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  )
}

function Field({
  icon: Icon,
  error,
  children,
}: {
  icon: typeof User
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA5B4]"
          strokeWidth={1.8}
        />
        {children}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[12px] font-medium text-[#D93025]">{children}</p>
}
