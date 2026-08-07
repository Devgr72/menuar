import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { FAQS, type FaqItem } from '../../constants/landing'
import SectionHeading, { Accent } from './ui/SectionHeading'
import Reveal from './ui/Reveal'

export default function Faq() {
  // A single open index across both columns, so only one answer shows at a time.
  const [open, setOpen] = useState<number | null>(null)
  const half = Math.ceil(FAQS.length / 2)
  const columns = [FAQS.slice(0, half), FAQS.slice(half)]

  return (
    <section id="faq" className="dd-anchor dd-section">
      <div className="dd-container">
        <SectionHeading subtitle="Everything restaurants usually ask us before getting started.">
          Frequently Asked <Accent>Questions</Accent>
        </SectionHeading>

        <div className="mt-9 grid gap-x-6 gap-y-3 md:grid-cols-2 lg:mt-11">
          {columns.map((column, colIndex) => (
            <ul key={colIndex} className="space-y-3">
              {column.map((faq, i) => {
                const index = colIndex * half + i
                return (
                  <Reveal
                    as="li"
                    key={faq.question}
                    direction={colIndex === 0 ? 'left' : 'right'}
                    delay={i * 0.05}
                  >
                    <FaqRow
                      faq={faq}
                      isOpen={open === index}
                      onToggle={() => setOpen(open === index ? null : index)}
                    />
                  </Reveal>
                )
              })}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqRow({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FaqItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border bg-white transition-colors duration-200 ${
        isOpen ? 'border-dd-orange/40 shadow-card' : 'border-dd-line hover:border-dd-orange/30'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
      >
        <span className="flex-1 font-poppins text-[14.5px] font-semibold leading-snug text-dd-navy sm:text-[15px]">
          {faq.question}
        </span>
        <span
          className={`grid h-7 w-7 flex-none place-items-center rounded-full transition-all duration-300 ${
            isOpen ? 'rotate-45 bg-dd-orange text-white' : 'bg-dd-orange-lt text-dd-orange'
          }`}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="px-5 pb-5 text-[13.5px] leading-[1.85] text-dd-muted sm:px-6">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
