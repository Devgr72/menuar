import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { createSubscription, getSubscriptionStatus } from '../api/client'

const IS_DEV = import.meta.env.DEV
function log(step: string, data?: unknown) {
  if (IS_DEV) console.log(`%c[PlanPage] ${step}`, 'color:#2563eb;font-weight:bold', data ?? '')
}
function logError(step: string, err: unknown) {
  if (IS_DEV) console.error(`%c[PlanPage] ✗ ${step}`, 'color:#ef4444;font-weight:bold', err)
}

// Razorpay JS SDK type shim
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}
interface RazorpayOptions {
  key: string
  subscription_id: string
  name: string
  description: string
  image?: string
  handler: (response: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
  }) => void
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void; escape?: boolean }
}
interface RazorpayInstance {
  open(): void
  on(event: string, handler: (response: { error: { description: string } }) => void): void
}

const FEATURES = [
  { icon: '🥘', text: '10 dishes with live 3D AR models' },
  { icon: '📱', text: 'QR code per table — no app needed' },
  { icon: '📊', text: 'Real-time scan analytics dashboard' },
  { icon: '🖼️', text: 'Photo upload for all dishes' },
  { icon: '🌐', text: 'Works on any smartphone browser' },
  { icon: '🔁', text: 'Monthly billing · cancel anytime' },
]

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

type PageState = 'checking' | 'ready' | 'error'

export default function PlanSelectionPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [pageState, setPageState] = useState<PageState>('checking')
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mount: check registration + subscription state → redirect if needed
  useEffect(() => {
    let cancelled = false
    async function checkStatus() {
      log('Checking subscription status on mount')
      try {
        const token = await getToken()
        if (!token || cancelled) { log('No token yet, showing page'); setPageState('ready'); return }
        log('Got Clerk token, calling /subscription/status')
        const { subscription } = await getSubscriptionStatus(token)
        if (cancelled) return
        log('Subscription status result', subscription)
        if (subscription?.status === 'active') {
          log('Already active → redirecting to /dashboard')
          navigate('/dashboard', { replace: true })
          return
        }
        setPageState('ready')
      } catch (err) {
        const code = (err as { code?: string }).code
        logError('Status check error', { code, err })
        if (cancelled) return
        if (code === 'NOT_REGISTERED') {
          // User hasn't completed onboarding yet — send them there
          log('NOT_REGISTERED → redirecting to /onboarding')
          navigate('/onboarding', { replace: true })
          return
        }
        // Any other error: show the page anyway (e.g. network hiccup)
        setPageState('ready')
      }
    }
    checkStatus()
    return () => { cancelled = true }
  }, [getToken, navigate])

  async function handleSubscribe() {
    setSubscribing(true)
    setError(null)
    log('Subscribe clicked', { user: user?.primaryEmailAddress?.emailAddress })

    try {
      // Step 1: Get Clerk token
      log('Step 1: Getting Clerk token')
      const token = await getToken()
      if (!token) throw new Error('Not authenticated — please refresh and try again')
      log('Step 1 ✓ Token obtained')

      // Step 2: Load Razorpay SDK
      log('Step 2: Loading Razorpay checkout.js')
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load Razorpay SDK. Check your internet connection.')
      log('Step 2 ✓ Razorpay SDK loaded, window.Razorpay:', typeof window.Razorpay)

      // Step 3: Create subscription on backend
      log('Step 3: Calling POST /api/v1/subscription/create')
      const { razorpaySubId, razorpayKeyId, checkoutUrl } = await createSubscription(token)
      log('Step 3 ✓ Subscription created', { razorpaySubId, razorpayKeyId: razorpayKeyId?.slice(0, 12) + '…', checkoutUrl })

      if (!razorpayKeyId) throw new Error('Payment service not configured — check RAZORPAY_KEY_ID in API .env')
      if (!razorpaySubId) throw new Error('Subscription ID not returned from server')

      // Step 4: Open inline Razorpay modal
      log('Step 4: Opening Razorpay modal', { subscription_id: razorpaySubId })
      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        subscription_id: razorpaySubId,
        name: 'DishDekho',
        description: 'Monthly AR Menu Subscription',
        image: '/dishdekho.jpeg',
        prefill: {
          name: user?.fullName ?? undefined,
          email: user?.primaryEmailAddress?.emailAddress ?? undefined,
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => {
            log('Razorpay modal dismissed by user')
            setSubscribing(false)
          },
          escape: false,
        },
        handler: (response) => {
          log('Step 4 ✓ Payment successful', {
            payment_id: response.razorpay_payment_id,
            subscription_id: response.razorpay_subscription_id,
          })
          navigate('/payment-callback')
        },
      })

      rzp.on('payment.failed', (response) => {
        logError('Razorpay payment.failed', response)
        setError(response.error.description || 'Payment failed. Please try again.')
        setSubscribing(false)
      })

      rzp.open()
      log('Step 4: Razorpay modal opened')
    } catch (err) {
      logError('handleSubscribe failed', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      const code = (err as { code?: string }).code
      if (code === 'ALREADY_SUBSCRIBED') {
        log('Already subscribed → redirecting to dashboard')
        navigate('/dashboard', { replace: true })
        return
      }
      if (code === 'NOT_REGISTERED') {
        log('NOT_REGISTERED → redirecting to onboarding')
        navigate('/onboarding', { replace: true })
        return
      }
      setError(msg)
      setSubscribing(false)
    }
  }

  // Checking subscription status
  if (pageState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins"
        style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #fafafa 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: 3 }} />
          <p className="text-slate-500 text-sm font-medium">Checking your account…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen font-poppins flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 60%, #fff7ed 100%)' }}
    >
      {/* Top nav bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 bg-white/70 backdrop-blur-md border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <img
            src="/dishdekho.jpeg"
            alt="DishDekho"
            className="h-9 w-9 rounded-xl object-cover border border-slate-100 shadow-sm"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <p className="text-[1.2rem] font-extrabold leading-none tracking-tight">
              <span className="text-amber-500">Dish</span>
              <span className="text-slate-900">Dekho</span>
            </p>
            <p className="text-slate-400 text-[9px] font-bold tracking-widest uppercase mt-[2px]">
              AR Restaurant Menus
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          🔒 Powered by Razorpay · Secure checkout
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-12">

        {/* Hero heading */}
        <div className="text-center mb-10 max-w-xl">
          <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Launch Offer — 50% Off
          </span>
          <h1 className="text-[2.2rem] sm:text-[2.6rem] font-extrabold text-slate-900 leading-[1.1] tracking-tight">
            Bring your menu <span className="text-[#2563eb]">to life</span><br />
            with <span className="text-amber-500">AR technology</span>
          </h1>
          <p className="text-slate-500 text-base mt-4 leading-relaxed">
            One simple plan. Everything you need to wow your guests and boost table engagement.
          </p>
        </div>

        {/* Plan card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden relative">

            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2563eb] via-[#60a5fa] to-amber-400" />

            {/* Badge */}
            <div className="absolute top-6 right-6">
              <span className="bg-amber-400 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                Best Value
              </span>
            </div>

            <div className="px-7 pt-7 pb-8">

              {/* Price */}
              <div className="mb-1">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
                  Starter Plan
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-slate-300 line-through text-xl font-semibold">₹1,000</span>
                  <span className="text-[3rem] font-black text-slate-900 leading-none">₹500</span>
                  <span className="text-slate-400 text-sm font-medium pb-1">/month</span>
                </div>
                <p className="text-[#2563eb] text-sm font-semibold mt-1.5 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  50% off — limited time launch price
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 my-5" />

              {/* Features */}
              <ul className="space-y-3 mb-7">
                {FEATURES.map((f) => (
                  <li key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base shrink-0">
                      {f.icon}
                    </div>
                    <span className="text-slate-700 text-sm font-medium">{f.text}</span>
                    <svg className="w-4 h-4 text-[#2563eb] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </li>
                ))}
              </ul>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="w-full relative overflow-hidden rounded-2xl py-4 text-white font-bold text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: subscribing
                    ? '#93c5fd'
                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow: subscribing ? 'none' : '0 8px 24px rgba(37,99,235,0.35)',
                }}
              >
                {subscribing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Opening payment…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Subscribe Now — ₹500/month
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Trust line */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-slate-400 text-xs font-medium">
                  Secured by Razorpay · Auto-renews monthly · Cancel anytime
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial / social proof */}
          <div className="mt-6 bg-white/80 border border-slate-200/60 rounded-2xl px-5 py-4 flex items-start gap-3 backdrop-blur-sm">
            <span className="text-2xl shrink-0">⭐</span>
            <div>
              <p className="text-slate-700 text-sm font-medium leading-snug">
                "Tables that used DishDekho saw <span className="text-[#2563eb] font-bold">40% fewer ordering mistakes</span> and guests spent more time exploring."
              </p>
              <p className="text-slate-400 text-xs mt-1.5 font-medium">— Priya R., Restaurant Owner · Mumbai</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
