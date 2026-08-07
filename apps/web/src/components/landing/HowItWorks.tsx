import { HOW_IT_WORKS } from '../../constants/landing'
import SectionHeading, { Accent } from './ui/SectionHeading'
import Reveal from './ui/Reveal'

/** "What is DishDekho?" — the four-step flow, on the soft peach panel. */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="dd-anchor dd-container">
      <div className="dd-panel bg-dd-soft">
        <SectionHeading
          subtitle={
            <>
              DishDekho is an innovative platform that offers AR Menu and Digital Menu solution for
              restaurants.
              <br className="hidden sm:block" /> Let your customers scan, explore your dishes in
              Augmented Reality,
              <br className="hidden sm:block" /> and place orders effortlessly — all from their
              smartphones.
            </>
          }
        >
          What <Accent>is DishDekho</Accent>?
        </SectionHeading>

        <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:mt-11 lg:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, lines, accent }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08}>
              <div className="group h-full rounded-card bg-white px-6 py-8 text-center shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover motion-reduce:hover:translate-y-0">
                <Icon
                  className={`mx-auto h-9 w-9 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100 ${
                    accent === 'orange' ? 'text-dd-orange' : 'text-dd-navy'
                  }`}
                  strokeWidth={1.5}
                />
                <h3 className="mt-5 font-poppins text-[16px] font-bold text-dd-navy">{title}</h3>
                <p className="mt-3 text-[13px] leading-[1.8] text-dd-muted">
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
      </div>
    </section>
  )
}
