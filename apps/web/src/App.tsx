import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      background: '#0F2747',
    }}>
      <img
        src="/dishdekho-icon.png"
        alt="DishDekho"
        style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 16, padding: 6 }}
      />
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(255,255,255,0.2)',
        borderTop: '3px solid #FF6B00',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
import LandingPage from './pages/LandingPage'
import LegalPage from './pages/LegalPage'
import { PRIVACY_POLICY, TERMS_AND_CONDITIONS } from './constants/legal'
import NotFoundPage from './pages/NotFoundPage'
import MenuARPage from './pages/MenuARPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import PlanSelectionPage from './pages/PlanSelectionPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import RestaurantDashboardPage from './pages/RestaurantDashboardPage'
import DigitalMenuPage from './pages/DigitalMenuPage'
import EditDigitalMenuPage from './pages/EditDigitalMenuPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { useAuthState } from './hooks/useAuthState'

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
        {/* Public marketing site */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<LegalPage doc={PRIVACY_POLICY} />} />
        <Route path="/terms" element={<LegalPage doc={TERMS_AND_CONDITIONS} />} />

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
        <Route
          path="/dashboard/digital-menu"
          element={
            <ProtectedRoute require="active">
              <DigitalMenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/digital-menu/edit"
          element={
            <ProtectedRoute require="active">
              <EditDigitalMenuPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
