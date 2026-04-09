import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { createSubscription } from '../api/client'

const FEATURES = [
  '10 dishes with 3D AR models',
  'QR code for your restaurant',
  'Restaurant dashboard',
  'Photo upload for all dishes',
  'Priority support',
  'Monthly billing, cancel anytime',
]

export default function PlanSelectionPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const { checkoutUrl } = await createSubscription(token)
      window.location.href = checkoutUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('ALREADY_SUBSCRIBED')) {
        navigate('/dashboard')
      } else {
        setError(msg)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Choose your plan</h1>
          <p className="text-gray-400 mt-2 text-sm">Start bringing your menu to life in AR</p>
        </div>

        <div className="bg-gray-900 border border-orange-600/40 rounded-2xl p-6 relative overflow-hidden">
          {/* Popular badge */}
          <div className="absolute top-4 right-4 bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            BEST VALUE
          </div>

          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 line-through text-xl">₹1,000</span>
              <span className="text-white text-4xl font-bold">₹500</span>
              <span className="text-gray-400 text-sm">/month</span>
            </div>
            <p className="text-orange-400 text-xs mt-1 font-medium">Launch offer — 50% off</p>
          </div>

          <ul className="space-y-3 mb-6">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                <svg className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 transition-colors text-base"
          >
            {loading ? 'Redirecting to payment...' : 'Subscribe Now — ₹500/month'}
          </button>

          <p className="text-center text-gray-600 text-xs mt-3">
            Secure payment via Razorpay · Auto-renews monthly
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Already subscribed?{' '}
          <button
            className="text-orange-500 underline"
            onClick={() => navigate('/dashboard')}
          >
            Go to dashboard
          </button>
        </p>
      </div>
    </div>
  )
}
