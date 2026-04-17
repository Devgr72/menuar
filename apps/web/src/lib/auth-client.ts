import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api/auth`,
})

export const {
  useSession,  // replaces useAuth() + useUser()
  signIn,      // replaces Clerk SignIn callbacks
  signOut,     // replaces useClerk().signOut()
} = authClient
