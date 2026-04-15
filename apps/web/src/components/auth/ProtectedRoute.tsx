import { Navigate, useLocation } from 'react-router-dom'
import { useAuthState } from '../../hooks/useAuthState'

interface Props {
  children: React.ReactNode
  /**
   * Which state this route requires.
   *
   * - 'active'           (default) → /dashboard: only fully paid users
   * - 'needs_onboarding' → /onboarding: redirect away if already registered/paid
   * - 'needs_payment'    → /select-plan, /payment-callback: redirect away if already paid
   */
  require?: 'active' | 'needs_onboarding' | 'needs_payment'
}

const Spinner = () => (
  <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function ProtectedRoute({ children, require: requiredState = 'active' }: Props) {
  const { status } = useAuthState()
  const location = useLocation()

  if (status === 'loading') return <Spinner />

  if (status === 'unauthenticated') {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  // ── /dashboard (require='active') ─────────────────────────────────────────
  if (requiredState === 'active') {
    if (status === 'needs_onboarding') return <Navigate to="/onboarding" replace />
    if (status === 'needs_payment')    return <Navigate to="/select-plan" replace />
    // status === 'active' → fall through to render
  }

  // ── /onboarding (require='needs_onboarding') ──────────────────────────────
  if (requiredState === 'needs_onboarding') {
    if (status === 'needs_payment') return <Navigate to="/select-plan" replace />
    if (status === 'active')        return <Navigate to="/dashboard" replace />
    // status === 'needs_onboarding' → fall through to render
  }

  // ── /select-plan, /payment-callback (require='needs_payment') ─────────────
  if (requiredState === 'needs_payment') {
    if (status === 'needs_onboarding') return <Navigate to="/onboarding" replace />
    if (status === 'active')           return <Navigate to="/dashboard" replace />
    // status === 'needs_payment' → fall through to render
  }

  return <>{children}</>
}
