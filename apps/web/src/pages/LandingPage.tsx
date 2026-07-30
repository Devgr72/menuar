import { useEffect } from 'react'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import WhyChoose from '../components/landing/WhyChoose'
import Pricing from '../components/landing/Pricing'
import Partner from '../components/landing/Partner'
import RestaurantCTA from '../components/landing/RestaurantCTA'
import ContactSection from '../components/landing/ContactSection'
import Faq from '../components/landing/Faq'
import Footer from '../components/landing/Footer'

const TITLE = 'DishDekho — AR Menu & Digital Menu for Restaurants'
const DESCRIPTION =
  'DishDekho brings your restaurant menu to life with Augmented Reality. Guests scan a QR code, ' +
  'explore dishes in 3D and order right from their table. ₹999/month, no setup fee.'

export default function LandingPage() {
  useEffect(() => {
    document.title = TITLE
    setMeta('name', 'description', DESCRIPTION)
    setMeta('property', 'og:title', TITLE)
    setMeta('property', 'og:description', DESCRIPTION)
  }, [])

  return (
    // No overflow-x-hidden here — it would make this div a scroll container and
    // break the sticky navbar. The hero clips its own bleed instead.
    <div className="min-h-screen bg-white font-poppins text-dd-ink">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <WhyChoose />
        <Pricing />
        <Partner />
        <RestaurantCTA />
        <ContactSection />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}

function setMeta(keyAttr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(keyAttr, key)
    document.head.appendChild(tag)
  }
  tag.content = content
}
