import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../lib/auth-client'
import { registerRestaurant } from '../api/client'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()

  const [form, setForm] = useState({
    ownerName: '',
    restaurantName: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill owner name from session when it loads
  useEffect(() => {
    if (session?.user?.name && !form.ownerName) {
      setForm((f) => ({ ...f, ownerName: session.user.name ?? '' }))
    }
  }, [session?.user?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await registerRestaurant({
        ownerName: form.ownerName.trim(),
        restaurantName: form.restaurantName.trim(),
        email: session?.user?.email,
      })

      setSuccess(true)

      // Hard redirect — full page reload ensures useAuthState picks up the new DB record
      setTimeout(() => {
        window.location.href = '/select-plan'
      }, 1200)

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      const code = (err as { code?: string }).code

      if (code === 'ALREADY_REGISTERED' || msg.includes('ALREADY_REGISTERED')) {
        // Already registered — go straight to plan selection
        window.location.href = '/select-plan'
      } else {
        setError(msg)
        setLoading(false)
      }
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 60%, #fff7ed 100%)' }}>
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: "'Inter', 'Poppins', sans-serif",
        background: 'linear-gradient(135deg, #f0f7ff 0%, #f8fafc 60%, #fff7ed 100%)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.23,1,0.32,1) forwards; }

        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .progress-fill { animation: progressFill 1.2s ease-in-out forwards; }

        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        @keyframes dotBounce {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }
        .dot-b1 { animation: dotBounce 0.9s ease-in-out infinite 0s; }
        .dot-b2 { animation: dotBounce 0.9s ease-in-out infinite 0.15s; }
        .dot-b3 { animation: dotBounce 0.9s ease-in-out infinite 0.3s; }

        .input-field {
          width: 100%;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          color: #1e293b;
          font-size: 14px;
          background: #f8fafc;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: inherit;
          outline: none;
        }
        .input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
          background: #fff;
        }
        .input-field::placeholder { color: #94a3b8; }
        .input-field:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-5" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
        <img
          src="/dishdekho.jpeg"
          alt="DishDekho"
          className="h-9 w-9 rounded-xl object-cover"
          style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: '#f59e0b' }}>Dish</span>
            <span style={{ color: '#0f172a' }}>Dekho</span>
          </p>
          <p style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            AR Restaurant Menus
          </p>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md fade-up">

          {/* Step indicator */}
          <div className="flex items-center gap-2 justify-center mb-8">
            {[
              { n: 1, label: 'Sign up',      done: true  },
              { n: 2, label: 'Your details', done: false, active: true },
              { n: 3, label: 'Choose plan',  done: false },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: step.done ? '#22c55e' : step.active ? '#2563eb' : '#e2e8f0',
                    color: step.done || step.active ? '#fff' : '#94a3b8',
                    transition: 'all 0.3s',
                  }}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, display: 'none',
                    color: step.done ? '#22c55e' : step.active ? '#2563eb' : '#94a3b8',
                  }} className="sm:inline">{step.label}</span>
                </div>
                {i < 2 && <div style={{ width: 32, height: 1, background: '#e2e8f0' }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Progress bar at top */}
            <div style={{ height: 4, background: '#f0f7ff' }}>
              {success ? (
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #22c55e)', width: '100%', transition: 'width 1.2s ease' }} />
              ) : (
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #2563eb, #60a5fa, #f59e0b)', width: '55%' }} />
              )}
            </div>

            <div style={{ padding: '32px 28px 36px' }}>
              {/* Success state */}
              {success ? (
                <div className="text-center py-4 fade-up">
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
                  }} className="check-pop">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Restaurant Created! 🎉</h2>
                  <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Taking you to plan selection…</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} className="dot-b1" />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} className="dot-b2" />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} className="dot-b3" />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                      Set up your restaurant
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
                      Just two quick details — takes 30 seconds.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        className="input-field"
                        placeholder="e.g. Rahul Sharma"
                        value={form.ownerName}
                        onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="organization"
                        className="input-field"
                        placeholder="e.g. The Spice Garden"
                        value={form.restaurantName}
                        onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
                        disabled={loading}
                      />
                      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                        This will appear on your AR menu and QR code.
                      </p>
                    </div>

                    {error && (
                      <div className="fade-up" style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 16px', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        borderRadius: 16,
                        padding: '16px 0',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        background: loading
                          ? '#93c5fd'
                          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        boxShadow: loading ? 'none' : '0 8px 24px rgba(37,99,235,0.3)',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        marginTop: 4,
                        fontFamily: 'inherit',
                      }}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin" width="18" height="18" fill="none" viewBox="0 0 24 24">
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                            <path style={{ opacity: 0.85 }} fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Setting up your restaurant…
                        </>
                      ) : (
                        <>
                          Continue to Plan Selection
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {!success && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 20 }}>
              Signed in as{' '}
              <span style={{ color: '#475569', fontWeight: 600 }}>
                {session?.user?.email}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
