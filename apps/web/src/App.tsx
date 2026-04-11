import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, AuthenticateWithRedirectCallback } from '@clerk/react'
import MenuARPage from './pages/MenuARPage'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import PlanSelectionPage from './pages/PlanSelectionPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import RestaurantDashboardPage from './pages/RestaurantDashboardPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

function RootRedirect() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  return <Navigate to={isSignedIn ? '/dashboard' : '/sign-up'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public AR experience */}
        <Route path="/ar/:restaurantSlug" element={<MenuARPage />} />
        <Route path="/ar" element={<MenuARPage />} />

        {/* Auth pages — wildcard catches all Clerk sub-routes:
            /sign-up/verify-email-address, /sign-up/continue
            /sign-in/factor-one, /sign-in/factor-two, etc. */}
        <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
        <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
        <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
        <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />

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

        {/* Onboarding (post-signup) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Plan selection + payment */}
        <Route
          path="/select-plan"
          element={
            <ProtectedRoute>
              <PlanSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-callback"
          element={
            <ProtectedRoute>
              <PaymentCallbackPage />
            </ProtectedRoute>
          }
        />

        {/* Restaurant dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RestaurantDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Root: redirect based on auth state */}
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
