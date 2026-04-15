import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
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
  if (status === 'loading') return null
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
  if (status === 'loading') return null
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

        {/* Auth pages
            FIX (double OTP): exact /sign-up redirects to /sign-up/ so that
            the only matched route is /sign-up/* for ALL Clerk sub-paths
            (/sign-up/verify-email-address etc.). This prevents unmount/remount
            of <AuthPage> as Clerk navigates between steps, which was causing
            a second OTP to be sent.
        */}
        <Route path="/sign-up" element={<Navigate to="/sign-up/" replace />} />
        <Route path="/sign-up/*" element={<AuthPageGuard mode="sign-up" />} />
        <Route path="/sign-in" element={<Navigate to="/sign-in/" replace />} />
        <Route path="/sign-in/*" element={<AuthPageGuard mode="sign-in" />} />

        {/* SSO / OAuth callback — Clerk redirects here after Google sign-in */}
        <Route
          path="/sso-callback"
          element={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 font-poppins">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Completing sign-in…</p>
              </div>
              <AuthenticateWithRedirectCallback />
            </div>
          }
        />

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
