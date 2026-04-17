import { useEffect, useRef, useState } from 'react'
import { useSession } from '../lib/auth-client'
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
 * Determines the user's full lifecycle state by combining Better Auth session
 * with the DB record from /api/v1/auth/me.
 */
export function useAuthState(): AuthState {
  const { data: session, isPending } = useSession()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Safety timeout — if session check hangs >6s, treat as unauthenticated
  useEffect(() => {
    const t = setTimeout(() => {
      if (mountedRef.current && status === 'loading') {
        setStatus('unauthenticated')
      }
    }, 6000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    if (isPending) return

    if (!session) {
      setStatus('unauthenticated')
      return
    }

    // Signed in — check DB state
    let cancelled = false
    async function check() {
      try {
        const { owner, subscription } = await getMe()

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
        if (cancelled || !mountedRef.current) return
        setStatus('needs_onboarding')
      }
    }

    check()
    return () => { cancelled = true }
  }, [isPending, session])

  return { status }
}
