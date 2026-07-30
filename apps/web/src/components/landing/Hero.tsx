import { ArrowRight } from 'lucide-react'
import { HERO_HIGHLIGHTS } from '../../constants/landing'
import { ButtonAnchor, ButtonLink } from './ui/Button'
import Reveal from './ui/Reveal'
import HeroVisual from './HeroVisual'

export default function Hero() {
  return (
    <section id="home" className="dd-anchor overflow-hidden">
      <div className="dd-container grid items-center gap-10 py-6 lg:grid-cols-[minmax(0,52%)_minmax(0,48%)] lg:gap-8 lg:py-10">
        {/* ── Copy ───────────────────────────────────────────────────────── */}
        <div className="order-2 lg:order-1">
          <Reveal direction="left">
            {/* Fluid size so "AR. Order. Enjoy." always stays on one line. */}
            <h1 className="font-poppins text-[clamp(1.875rem,4.4vw,3.5rem)] font-bold leading-[1.15] tracking-tight text-dd-navy">
              Scan. Explore in
              <br />
              <span className="text-dd-orange">AR. Order. Enjoy.</span>
            </h1>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <p className="mt-6 font-poppins text-[17px] font-bold text-dd-navy sm:text-[19px]">
              The Future of Dining Experience is Here.
            </p>
          </Reveal>

          <Reveal direction="left" delay={0.16}>
            <p className="mt-4 max-w-[440px] text-[15px] leading-[1.9] text-dd-muted">
              DishDekho brings your menu to life with Augmented Reality and Digital Menu — Scan,
              Explore, and Order while sitting at your table.
            </p>
          </Reveal>

          <Reveal direction="left" delay={0.22}>
            <div className="mt-8 flex flex-wrap gap-4">
              <ButtonLink to="/ar" size="lg">
                Explore Demo
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonAnchor href="#contact" variant="outline" size="lg">
                Contact Us
              </ButtonAnchor>
            </div>
          </Reveal>

          {/* Quick highlights */}
          <Reveal direction="left" delay={0.28}>
            <ul className="mt-8 flex items-stretch">
              {HERO_HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
                <li
                  key={label}
                  className={`flex flex-col items-center gap-2 px-5 first:pl-0 sm:px-8 ${
                    i > 0 ? 'border-l border-dd-line' : ''
                  }`}
                >
                  <Icon className="h-7 w-7 text-dd-orange" strokeWidth={1.6} />
                  <span className="whitespace-nowrap font-poppins text-[13px] font-semibold text-dd-navy">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* ── Visual ─────────────────────────────────────────────────────── */}
        <Reveal direction="right" delay={0.1} className="order-1 lg:order-2">
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  )
}
