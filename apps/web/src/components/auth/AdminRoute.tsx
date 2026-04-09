import { useAuth, useUser } from '@clerk/react'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean)

interface Props {
  children: React.ReactNode
}

export default function AdminRoute({ children }: Props) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? ''
  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-gray-400 mt-1 text-sm">This area is restricted to admins.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
