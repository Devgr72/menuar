import { createAuthClient } from 'better-auth/react'

// better-auth requires an absolute URL — relative paths throw "Invalid URL"
// In dev: proxy sends /api/auth → localhost:3001, so use window.location.origin
// In prod: VITE_API_URL is the deployed API base
const authBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/auth`
  : `${window.location.origin}/api/auth`

export const authClient = createAuthClient({
  baseURL: authBase,
})

export const {
  useSession,  // replaces useAuth() + useUser()
  signIn,      // replaces Clerk SignIn callbacks
  signOut,     // replaces useClerk().signOut()
} = authClient
