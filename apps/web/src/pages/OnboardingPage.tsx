import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { registerRestaurant } from '../api/client'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user } = useUser()

  const [form, setForm] = useState({
    ownerName: user?.fullName ?? '',
    restaurantName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      await registerRestaurant(token, {
        ownerName: form.ownerName,
        restaurantName: form.restaurantName,
        email: user?.primaryEmailAddress?.emailAddress,
      })

      navigate('/select-plan')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      if (msg.includes('ALREADY_REGISTERED')) {
        navigate('/dashboard')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-white">Set up your restaurant</h1>
          <p className="text-gray-400 mt-2 text-sm">Just a few details to get you started</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Your name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              placeholder="Full name"
              value={form.ownerName}
              onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Restaurant name
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              placeholder="e.g. The Spice Garden"
              value={form.restaurantName}
              onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 transition-colors"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          Signed in as {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
    </div>
  )
}
