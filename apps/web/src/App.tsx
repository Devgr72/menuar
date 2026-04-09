import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignIn, SignUp, useAuth } from '@clerk/react'
import MenuARPage from './pages/MenuARPage'
import OnboardingPage from './pages/OnboardingPage'
import PlanSelectionPage from './pages/PlanSelectionPage'
import PaymentCallbackPage from './pages/PaymentCallbackPage'
import RestaurantDashboardPage from './pages/RestaurantDashboardPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'

function RootRedirect() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  return <Navigate to={isSignedIn ? '/dashboard' : '/sign-up'} replace />
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#ea580c',
    colorBackground: '#111827',
    colorText: '#ffffff',
    colorTextSecondary: '#9ca3af',
    colorInputBackground: '#1f2937',
    colorInputText: '#ffffff',
  },
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public AR experience */}
        <Route path="/ar/:restaurantSlug" element={<MenuARPage />} />
        <Route path="/ar" element={<MenuARPage />} />

        {/* Clerk auth pages — centered dark layout */}
        <Route
          path="/sign-up"
          element={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/onboarding"
                appearance={CLERK_APPEARANCE}
              />
            </div>
          }
        />
        <Route
          path="/sign-in"
          element={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
                appearance={CLERK_APPEARANCE}
              />
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

        {/* Admin panel */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        {/* Root: redirect based on auth state */}
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
