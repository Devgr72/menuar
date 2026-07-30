import { useEffect } from 'react'
import { Mail } from 'lucide-react'
import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'
import Reveal from '../components/landing/ui/Reveal'
import { CONTACT_DETAILS } from '../constants/landing'
import type { LegalDocument } from '../constants/legal'

export default function LegalPage({ doc }: { doc: LegalDocument }) {
  useEffect(() => {
    document.title = `${doc.title} — DishDekho`
    window.scrollTo(0, 0)
  }, [doc.title])

  return (
    <div className="flex min-h-screen flex-col bg-white font-poppins text-dd-ink">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <div className="bg-dd-soft">
          <div className="dd-container py-12 lg:py-16">
            <Reveal>
              <p className="font-poppins text-[11px] font-bold uppercase tracking-[0.2em] text-dd-orange">
                Last updated {doc.lastUpdated}
              </p>
              <h1 className="mt-3 font-poppins text-[32px] font-bold leading-tight text-dd-navy sm:text-[40px]">
                {doc.title}
              </h1>
              <p className="mt-5 max-w-[760px] text-[14.5px] leading-[1.9] text-dd-muted">
                {doc.intro}
              </p>
            </Reveal>
          </div>
        </div>

        <div className="dd-container grid gap-10 py-12 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-14 lg:py-16">
          {/* Contents */}
          {/* Hidden on small screens — 14 links ahead of the body is a lot of scrolling */}
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-[104px] lg:block lg:self-start">
            <p className="font-poppins text-[13px] font-bold uppercase tracking-wider text-dd-navy">
              On this page
            </p>
            <ul className="mt-4 space-y-2 border-l border-dd-line pl-4">
              {doc.sections.map((section, i) => (
                <li key={section.heading}>
                  <a
                    href={`#section-${i}`}
                    className="block text-[13px] leading-snug text-dd-muted transition-colors hover:text-dd-orange"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Body */}
          <div className="max-w-[760px]">
            {doc.sections.map((section, i) => (
              <Reveal key={section.heading} delay={Math.min(i, 4) * 0.04}>
                <section id={`section-${i}`} className="scroll-mt-[104px] border-t border-dd-line py-7 first:border-t-0 first:pt-0">
                  <h2 className="font-poppins text-[19px] font-bold text-dd-navy sm:text-[21px]">
                    {section.heading}
                  </h2>

                  {section.paragraphs?.map((text) => (
                    <p key={text} className="mt-4 text-[14.5px] leading-[1.9] text-dd-muted">
                      {text}
                    </p>
                  ))}

                  {section.bullets && (
                    <ul className="mt-4 space-y-2.5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-[14.5px] leading-[1.9] text-dd-muted">
                          <span className="mt-[11px] h-1.5 w-1.5 flex-none rounded-full bg-dd-orange" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Reveal>
            ))}

            {/* Contact callout */}
            <Reveal>
              <div className="mt-8 flex flex-wrap items-center gap-4 rounded-card bg-dd-soft px-6 py-6">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-white">
                  <Mail className="h-5 w-5 text-dd-orange" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-poppins text-[15px] font-bold text-dd-navy">
                    Still have a question?
                  </p>
                  <a
                    href={`mailto:${CONTACT_DETAILS.email}`}
                    className="text-[14px] font-medium text-dd-orange hover:underline"
                  >
                    {CONTACT_DETAILS.email}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
