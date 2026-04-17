import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07090f',
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(107,60,255,0.2)',
        borderTop: '3px solid #6b3cff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
import MenuARPage from './pages/MenuARPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import PlanSelectionPage from './pages/PlanSelectionPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import RestaurantDashboardPage from './pages/RestaurantDashboardPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuthState } from './hooks/useAuthState'

/**
 * Smart root redirect — consults full lifecycle state so a returning signed-in
 * user lands on the right page instead of blindly going to /dashboard.
 */
function RootRedirect() {
  const { status } = useAuthState()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated')   return <Navigate to="/sign-in" replace />
  if (status === 'needs_onboarding')  return <Navigate to="/onboarding" replace />
  if (status === 'needs_payment')     return <Navigate to="/select-plan" replace />
  return <Navigate to="/dashboard" replace />
}

/**
 * Guards /sign-in and /sign-up: redirects already-authenticated users to
 * the correct page so they never see the auth form when logged in.
 */
function AuthPageGuard({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { status } = useAuthState()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'active')           return <Navigate to="/dashboard" replace />
  if (status === 'needs_payment')    return <Navigate to="/select-plan" replace />
  if (status === 'needs_onboarding') return <Navigate to="/onboarding" replace />
  return <AuthPage mode={mode} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public AR experience */}
        <Route path="/ar/:restaurantSlug" element={<MenuARPage />} />
        <Route path="/ar" element={<MenuARPage />} />

        {/* Auth pages */}
        <Route path="/sign-up" element={<AuthPageGuard mode="sign-up" />} />
        <Route path="/sign-in" element={<AuthPageGuard mode="sign-in" />} />

        {/* Onboarding (post-signup, pre-payment) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute require="needs_onboarding">
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Plan selection + payment */}
        <Route
          path="/select-plan"
          element={
            <ProtectedRoute require="needs_payment">
              <PlanSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-callback"
          element={
            <ProtectedRoute require="needs_payment">
              <PaymentCallbackPage />
            </ProtectedRoute>
          }
        />

        {/* Restaurant dashboard — active subscription required */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute require="active">
              <RestaurantDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Root: smart redirect based on full lifecycle state */}
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
