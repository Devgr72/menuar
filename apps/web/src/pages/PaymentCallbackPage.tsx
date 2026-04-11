import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { getSubscriptionStatus, createSubscription } from '../api/client'

type State = 'loading' | 'success' | 'pending' | 'halted' | 'error'

const IS_DEV = import.meta.env.DEV
const API_URL = import.meta.env.VITE_API_URL || ''

export default function PaymentCallbackPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [state, setState] = useState<State>('loading')
  const [retrying, setRetrying] = useState(false)
  const [dots, setDots] = useState('.')

  // Animated dots for loading
  useEffect(() => {
    if (state !== 'loading') return
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '.' : d + '.')), 600)
    return () => clearInterval(id)
  }, [state])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 20 // 40 seconds

    async function poll() {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 2000))
        attempts++
        try {
          const token = await getToken()
          if (!token || cancelled) return
          const { subscription } = await getSubscriptionStatus(token)
          if (!subscription) continue

          if (subscription.status === 'active') {
            if (!cancelled) {
              setState('success')
              setTimeout(() => navigate('/dashboard', { replace: true }), 2200)
            }
            return
          }
          if (subscription.status === 'halted') { if (!cancelled) setState('halted'); return }
          if (subscription.status === 'cancelled') { if (!cancelled) setState('error'); return }
        } catch {
          // Transient error — keep polling
        }
      }
      if (!cancelled) setState('pending')
    }

    poll()
    return () => { cancelled = true }
  }, [getToken, navigate])

  async function handleRetry() {
    setRetrying(true)
    try {
      const token = await getToken()
      if (!token) return
      const { checkoutUrl } = await createSubscription(token)
      window.location.href = checkoutUrl
    } catch {
      setRetrying(false)
    }
  }

  // Dev-only: manually activate (no webhook in local dev)
  async function handleDevActivate() {
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/v1/dev/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setState('success')
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
      } else {
        const body = await res.json()
        alert(body.error || 'Dev activation failed')
      }
    } catch {
      alert('Dev activation failed — is the API running?')
    }
  }

  return (
    <div
      className="min-h-screen font-poppins flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 60%, #fff7ed 100%)' }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-5 bg-white/70 backdrop-blur-md border-b border-slate-200/60">
        <img
          src="/dishdekho.jpeg"
          alt="DishDekho"
          className="h-9 w-9 rounded-xl object-cover border border-slate-100"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <p className="text-[1.15rem] font-extrabold">
          <span className="text-amber-500">Dish</span>
          <span className="text-slate-900">Dekho</span>
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 px-8 py-10 text-center">

            {/* ── LOADING ── */}
            {state === 'loading' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="w-16 h-16 border-4 border-slate-100 rounded-full" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xl">💳</div>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Processing your payment{dots}</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Please wait while we confirm your payment.<br />
                  This usually takes a few seconds.
                </p>
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-left">
                  <p className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">What happens next</p>
                  {[
                    'Payment is verified by Razorpay',
                    'Your subscription gets activated',
                    'You\'re redirected to your dashboard',
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-2.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-blue-600 text-xs font-medium">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Dev-only helper — hidden in production */}
                {IS_DEV && (
                  <div className="mt-6 border border-dashed border-slate-200 rounded-2xl p-4">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Dev mode — no webhook in localhost
                    </p>
                    <button
                      onClick={handleDevActivate}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl py-2.5 transition-colors"
                    >
                      ⚡ Simulate payment success
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── SUCCESS ── */}
            {state === 'success' && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">You're all set! 🎉</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Welcome to DishDekho. Your subscription is active.<br />
                  Redirecting to your dashboard…
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#2563eb] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </>
            )}

            {/* ── PENDING (timed out) ── */}
            {state === 'pending' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 bg-amber-50 rounded-full flex items-center justify-center text-3xl border-4 border-amber-100">
                  ⏳
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Still processing…</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Your payment may take a few more minutes to confirm.<br />
                  Check your dashboard — it'll update automatically.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => setState('loading')}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Check Again
                  </button>
                </div>
              </>
            )}

            {/* ── HALTED (payment failed) ── */}
            {state === 'halted' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center text-3xl border-4 border-red-100">
                  ❌
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Payment failed</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Your bank couldn't process this payment.<br />
                  Try a different card or UPI method.
                </p>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-slate-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {retrying ? 'Opening checkout…' : 'Retry Payment'}
                </button>
              </>
            )}

            {/* ── ERROR / CANCELLED ── */}
            {state === 'error' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 bg-orange-50 rounded-full flex items-center justify-center text-3xl border-4 border-orange-100">
                  ⚠️
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Your subscription was cancelled or encountered an error.<br />
                  Contact us if you were charged.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/select-plan')}
                    className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    Try Again
                  </button>
                  <a
                    href="mailto:support@dishdekho.in"
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl py-3 text-sm transition-colors text-center"
                  >
                    Contact Support
                  </a>
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <p className="text-slate-400 text-xs text-center mt-5">
            🔒 Payments secured by Razorpay · PCI DSS compliant
          </p>
        </div>
      </div>
    </div>
  )
}
