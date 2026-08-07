import { WHY_CHOOSE } from '../../constants/landing'
import SectionHeading, { Accent } from './ui/SectionHeading'
import Reveal from './ui/Reveal'

/** "Why Choose DishDekho?" — five divider-separated benefit columns. */
export default function WhyChoose() {
  return (
    <section id="features" className="dd-anchor dd-section">
      <div className="dd-container">
        <SectionHeading>
          Why Choose <Accent>DishDekho</Accent>?
        </SectionHeading>

        {/* Six items divide evenly at every breakpoint: 2 × 3 on phones,
            3 × 2 on tablets, one row of six from xl. */}
        <ul className="mt-9 grid grid-cols-2 gap-y-9 sm:grid-cols-3 lg:mt-11 xl:grid-cols-6 xl:gap-y-0">
          {WHY_CHOOSE.map(({ icon: Icon, title, lines }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.07}
              // Dividers only once all six sit on one row, so they never land
              // at the start of a wrapped row on smaller grids.
              className={`group px-3 text-center sm:px-5 ${
                i > 0 ? 'xl:border-l xl:border-dd-line' : ''
              }`}
            >
              <Icon
                className="mx-auto h-8 w-8 text-dd-orange transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                strokeWidth={1.5}
              />
              <h3 className="mt-4 whitespace-pre-line font-poppins text-[15px] font-bold leading-snug text-dd-navy">
                {title}
              </h3>
              <p className="mt-3 text-[13px] leading-[1.8] text-dd-muted">
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
