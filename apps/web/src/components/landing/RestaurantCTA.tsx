import { Headphones, Store } from 'lucide-react'
import Reveal from './ui/Reveal'
import { ButtonAnchor, ButtonLink } from './ui/Button'

export default function RestaurantCTA() {
  return (
    <section className="dd-container py-4 lg:py-6">
      <Reveal direction="scale">
        <div className="relative overflow-hidden rounded-card bg-dd-navy px-6 py-10 sm:px-10 lg:px-14 lg:py-11">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            {/* Restaurants */}
            <div className="flex items-start gap-4 lg:gap-5">
              <Store className="h-11 w-11 flex-none text-dd-orange" strokeWidth={1.4} />
              <div>
                <h3 className="font-poppins text-[19px] font-bold text-white sm:text-[21px]">
                  Are you a Restaurant?
                </h3>
                <p className="mt-2 text-[13px] leading-[1.8] text-white/65">
                  <span className="block">Get AR Menu &amp; Digital Menu for your restaurant</span>
                  <span className="block">and take your service to the next level.</span>
                </p>
                <ButtonLink to="/sign-up" className="mt-5">
                  Get Our Service
                </ButtonLink>
              </div>
            </div>

            {/* OR divider */}
            <div className="relative flex items-center justify-center lg:h-full lg:w-px">
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/15 lg:inset-x-auto lg:inset-y-0 lg:left-1/2 lg:h-full lg:w-px" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-dd-navy font-poppins text-[13px] font-bold text-white">
                OR
              </span>
            </div>

            {/* Direct contact */}
            <div className="flex items-start gap-4 lg:gap-5">
              <Headphones className="h-11 w-11 flex-none text-dd-orange" strokeWidth={1.4} />
              <div>
                <h3 className="font-poppins text-[19px] font-bold text-white sm:text-[21px]">
                  Want to Connect Directly?
                </h3>
                <p className="mt-2 text-[13px] leading-[1.8] text-white/65">
                  <span className="block">Talk to our team for partnership</span>
                  <span className="block">or restaurant services.</span>
                </p>
                <ButtonAnchor href="#contact" className="mt-5">
                  Contact Us Directly
                </ButtonAnchor>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
