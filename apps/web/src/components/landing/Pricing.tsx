import { Check } from 'lucide-react'
import { PRICING } from '../../constants/landing'
import SectionHeading, { Accent } from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import { ButtonLink } from './ui/Button'

/**
 * Card on the left, plan guarantees on the right. The two-column split plus a
 * two-column checklist keeps the whole section inside one desktop viewport;
 * below lg it stacks back to a single centred column.
 */
export default function Pricing() {
  return (
    <section id="pricing" className="dd-anchor dd-section">
      <div className="dd-container">
        <SectionHeading subtitle="One simple plan for every restaurant.">
          Simple <Accent>Pricing</Accent>,
          <br className="sm:hidden" /> Maximum Value
        </SectionHeading>

        <div className="mt-9 grid items-center gap-10 lg:mt-11 lg:grid-cols-2 lg:gap-14">
          {/* ── Plan card ─────────────────────────────────────────────── */}
          <Reveal direction="left">
            <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-card border border-dd-line bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="bg-dd-navy px-8 py-7 text-center text-white">
                <p className="font-poppins text-[15px] font-semibold tracking-wide text-white/80">
                  {PRICING.name}
                </p>
                <p className="mt-2 font-poppins text-[40px] font-bold leading-none sm:text-[46px]">
                  {PRICING.price}
                  <span className="text-[17px] font-medium text-white/70 sm:text-[19px]">
                    {PRICING.period}
                  </span>
                </p>
              </div>

              <div className="px-6 py-7 sm:px-8">
                <p className="text-center font-poppins text-[15px] font-bold text-dd-navy">
                  {PRICING.featuresTitle}
                </p>

                <ul className="mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {PRICING.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-full bg-dd-orange-lt">
                        <Check className="h-2.5 w-2.5 text-dd-orange" strokeWidth={3.5} />
                      </span>
                      <span className="text-[13.5px] leading-snug text-dd-ink">
                        {feature.label}
                        {feature.note && (
                          <span className="ml-1 text-[12px] text-dd-muted">{feature.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <ButtonLink to="/sign-in" size="lg" className="mt-7 w-full">
                  Get Started
                </ButtonLink>
              </div>
            </div>
          </Reveal>

          {/* ── Plan guarantees ───────────────────────────────────────── */}
          <Reveal direction="right" delay={0.1}>
            <div className="mx-auto max-w-[520px] lg:mx-0 lg:max-w-[440px]">
              <h3 className="font-poppins text-[22px] font-bold leading-snug text-dd-navy sm:text-[26px]">
                {PRICING.asideTitle}
              </h3>
              <p className="mt-4 text-[14px] leading-[1.9] text-dd-muted">{PRICING.asideBody}</p>

              <ul className="mt-7 space-y-5">
                {PRICING.assurances.map(({ label, detail }) => (
                  <li key={label} className="flex items-start gap-3.5">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-dd-orange-lt">
                      <Check className="h-4 w-4 text-dd-orange" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="font-poppins text-[15px] font-bold text-dd-navy">{label}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-dd-muted">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
