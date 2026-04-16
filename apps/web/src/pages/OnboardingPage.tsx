import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../lib/auth-client'
import { registerRestaurant } from '../api/client'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { data: session } = useSession()

  const [form, setForm] = useState({
    ownerName: session?.user?.name ?? '',
    restaurantName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await registerRestaurant({
        ownerName: form.ownerName,
        restaurantName: form.restaurantName,
        email: session?.user?.email,
      })

      navigate('/select-plan', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      if ((err as { code?: string }).code === 'ALREADY_REGISTERED' || msg.includes('ALREADY_REGISTERED')) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(msg)
        setLoading(false)
      }
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
          className="h-9 w-9 rounded-xl object-cover border border-slate-100 shadow-sm"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div>
          <p className="text-[1.15rem] font-extrabold leading-none">
            <span className="text-amber-500">Dish</span>
            <span className="text-slate-900">Dekho</span>
          </p>
          <p className="text-slate-400 text-[9px] font-bold tracking-widest uppercase mt-[2px]">
            AR Restaurant Menus
          </p>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">

          {/* Step indicator */}
          <div className="flex items-center gap-2 justify-center mb-8">
            {[
              { n: 1, label: 'Sign up',      done: true  },
              { n: 2, label: 'Your details', done: false },
              { n: 3, label: 'Choose plan',  done: false },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${step.done ? 'bg-green-500 text-white' : i === 1 ? 'bg-[#2563eb] text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block
                    ${step.done ? 'text-green-600' : i === 1 ? 'text-[#2563eb]' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {i < 2 && <div className="w-8 h-px bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#2563eb] via-[#60a5fa] to-amber-400" />

            <div className="px-7 pt-8 pb-9">
              <div className="mb-7">
                <h1 className="text-[1.7rem] font-extrabold text-slate-900 leading-tight tracking-tight">
                  Set up your restaurant
                </h1>
                <p className="text-slate-500 text-sm mt-1.5">
                  Just two details — takes 30 seconds.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Your name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                    placeholder="e.g. Rahul Sharma"
                    value={form.ownerName}
                    onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Restaurant name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="organization"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
                    placeholder="e.g. The Spice Garden"
                    value={form.restaurantName}
                    onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
                  />
                  <p className="text-slate-400 text-xs mt-1.5">This will appear on your AR menu and QR code.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl py-4 text-white font-bold text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{
                    background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: loading ? 'none' : '0 8px 24px rgba(37,99,235,0.3)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Continue to Plan Selection
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-slate-400 text-xs mt-5">
            Signed in as{' '}
            <span className="text-slate-600 font-medium">
              {session?.user?.email}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
