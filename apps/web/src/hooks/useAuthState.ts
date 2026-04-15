import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/react'
import { getMe } from '../api/client'

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'needs_onboarding'  // signed in, no DB record yet
  | 'needs_payment'     // registered in DB, no active subscription
  | 'active'            // registered + active subscription

export interface AuthState {
  status: AuthStatus
}

/**
 * Determines the user's full lifecycle state by combining Clerk auth
 * with the DB record from /api/v1/auth/me.
 *
 * Result is stable for the lifetime of the component — call this at
 * route-guard level (ProtectedRoute, RootRedirect) where it renders once.
 */
export function useAuthState(): AuthState {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [status, setStatus] = useState<AuthStatus>('loading')
  // Prevent setState after unmount
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      setStatus('unauthenticated')
      return
    }

    // Signed in — check DB state
    let cancelled = false
    async function check() {
      try {
        const token = await getToken()
        if (!token || cancelled) return

        const { owner, subscription } = await getMe(token)

        if (cancelled || !mountedRef.current) return

        if (!owner) {
          setStatus('needs_onboarding')
          return
        }

        if (subscription?.status === 'active') {
          setStatus('active')
        } else {
          setStatus('needs_payment')
        }
      } catch {
        // If the API returns NOT_REGISTERED (404) treat as needs_onboarding.
        // Any other error: default to needs_onboarding so user can re-register.
        if (cancelled || !mountedRef.current) return
        setStatus('needs_onboarding')
      }
    }

    check()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, getToken])

  return { status }
}
