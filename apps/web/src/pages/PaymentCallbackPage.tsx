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
  const [activating, setActivating] = useState(false)
  const [showDevButton, setShowDevButton] = useState(false)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 15 // 30 seconds at 2s intervals

    // Show dev button after 5 seconds if no webhook configured
    const devTimer = IS_DEV ? setTimeout(() => {
      if (!cancelled) setShowDevButton(true)
    }, 5000) : undefined

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
              setTimeout(() => navigate('/dashboard'), 2000)
            }
            return
          }

          if (subscription.status === 'halted') {
            if (!cancelled) setState('halted')
            return
          }

          if (subscription.status === 'cancelled') {
            if (!cancelled) setState('error')
            return
          }
        } catch {
          // Transient error — keep polling
        }
      }

      if (!cancelled) setState('pending')
    }

    poll()
    return () => {
      cancelled = true
      if (devTimer) clearTimeout(devTimer)
    }
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

  async function handleDevActivate() {
    setActivating(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/v1/dev/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setState('success')
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        const body = await res.json()
        alert(body.error || 'Activation failed')
        setActivating(false)
      }
    } catch {
      alert('Dev activation failed — is the API running?')
      setActivating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {state === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-semibold text-white">Waiting for payment</h1>
            <p className="text-gray-400 text-sm mt-2">
              Complete your payment in the other tab.<br />
              This page will update automatically.
            </p>

            {/* Dev-only manual activation — shown after 5s */}
            {IS_DEV && showDevButton && (
              <div className="mt-8 border border-dashed border-gray-700 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1 font-medium">Local dev mode</p>
                <p className="text-gray-600 text-xs mb-3">
                  After completing payment in the other tab, click below to activate:
                </p>
                <button
                  onClick={handleDevActivate}
                  disabled={activating}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-orange-400 text-sm font-medium rounded-lg py-2.5 transition-colors border border-gray-700"
                >
                  {activating ? 'Activating...' : '⚡ I completed payment — activate now'}
                </button>
              </div>
            )}
          </>
        )}

        {state === 'success' && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white">You're all set!</h1>
            <p className="text-gray-400 text-sm mt-2">Redirecting to your dashboard...</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="text-5xl mb-4">⏳</div>
            <h1 className="text-xl font-semibold text-white">Payment processing</h1>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Your payment is being processed. It may take a few minutes.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 text-sm"
              >
                Go to Dashboard
              </button>
              {IS_DEV && (
                <button
                  onClick={handleDevActivate}
                  disabled={activating}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-orange-400 text-sm rounded-xl px-6 py-2.5 border border-gray-700"
                >
                  {activating ? 'Activating...' : '⚡ Activate manually (dev only)'}
                </button>
              )}
            </div>
          </>
        )}

        {state === 'halted' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-white">Payment failed</h1>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Your bank couldn't process the payment. Please try again with a different method.
            </p>
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 text-white rounded-xl px-6 py-3 text-sm font-semibold"
            >
              {retrying ? 'Redirecting...' : 'Retry Payment'}
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
            <p className="text-gray-400 text-sm mt-2 mb-6">
              Please contact support if you were charged.
            </p>
            <button
              onClick={() => navigate('/select-plan')}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-6 py-3 text-sm"
            >
              Back to Plans
            </button>
          </>
        )}
      </div>
    </div>
  )
}
