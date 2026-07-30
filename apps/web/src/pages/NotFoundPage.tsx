import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'
import { ButtonLink } from '../components/landing/ui/Button'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found — DishDekho'
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-white font-poppins text-dd-ink">
      <Navbar />
      <main className="dd-container flex flex-1 flex-col items-center justify-center py-20 text-center lg:py-28">
        <p className="font-poppins text-[80px] font-bold leading-none text-dd-orange sm:text-[110px]">
          404
        </p>
        <h1 className="mt-4 font-poppins text-[26px] font-bold text-dd-navy sm:text-[32px]">
          This page is off the menu
        </h1>
        <p className="mt-4 max-w-[420px] text-[15px] leading-[1.9] text-dd-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <ButtonLink to="/" size="lg" className="mt-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </ButtonLink>
      </main>
      <Footer />
    </div>
  )
}
