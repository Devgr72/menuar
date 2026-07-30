import { ArrowRight } from 'lucide-react'
import { PARTNER_STEPS } from '../../constants/landing'
import SectionHeading, { Accent } from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import { ButtonLink } from './ui/Button'

export default function Partner() {
  return (
    <section id="partner" className="dd-anchor dd-container">
      <div className="dd-panel bg-dd-soft">
        <SectionHeading
          subtitle={
            <>
              Refer restaurants to DishDekho and earn attractive commission on every successful
              onboarding.
              <br className="hidden sm:block" /> It&apos;s simple, rewarding, and a great way to grow
              with us.
            </>
          }
        >
          Become a <Accent>Partner</Accent> &amp; <Accent>Earn Commission</Accent>!
        </SectionHeading>

        <ul className="mt-9 grid gap-8 md:grid-cols-3 md:gap-0 lg:mt-11">
          {PARTNER_STEPS.map(({ icon: Icon, title, lines }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.09}
              className={`flex items-start gap-4 px-2 md:px-8 ${
                i > 0 ? 'md:border-l md:border-[#E7D5C4]' : ''
              }`}
            >
              <Icon className="h-10 w-10 flex-none text-dd-orange" strokeWidth={1.4} />
              <div>
                <h3 className="font-poppins text-[15px] font-bold text-dd-navy">{title}</h3>
                <p className="mt-2 text-[13px] leading-[1.8] text-dd-muted">
                  {lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={0.2}>
          <div className="mt-9 flex justify-center">
            <ButtonLink to="/sign-up" variant="navy" size="lg" className="w-full max-w-[340px] rounded-full">
              Join Now &amp; Start Earning
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
