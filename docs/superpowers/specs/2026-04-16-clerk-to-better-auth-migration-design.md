# Auth Migration: Clerk → Better Auth

**Date:** 2026-04-16  
**Status:** Approved — ready to implement  
**Decision:** Replace Clerk with Better Auth (Option A)  
**Migration strategy:** Fresh start — existing users re-register

---

## Why We're Migrating

Clerk's development instance (`pk_test_*`) only works on `localhost`. Adding a production domain requires either paying for Clerk's production tier or creating a production instance with more restrictions. Since we own a database and control the stack, a self-hosted auth system removes this third-party dependency entirely and eliminates per-MAU pricing as the app scales.

---

## Chosen Solution: Better Auth

**Library:** [better-auth](https://www.better-auth.com) — TypeScript-first auth framework  
**Why this fits the project:**
- Works with Express + Prisma out of the box (official adapters for both)
- Google OAuth + email/password are first-class plugins
- React client hooks (`useSession`, `signIn`, `signOut`) map almost 1:1 to Clerk's API — migration surface is a find-and-replace, not a rewrite
- Sessions stored in DB → can be invalidated server-side (more secure than pure JWTs)
- Email verification built in (uses nodemailer or any SMTP)
- No per-user pricing, fully self-hosted

---

## Current Clerk Touchpoints (full inventory)

### Frontend — `apps/web/src`

| File | Clerk usage |
|---|---|
| `main.tsx` | `ClerkProvider` wraps app |
| `App.tsx` | `AuthenticateWithRedirectCallback` (SSO callback route) |
| `pages/AuthPage.tsx` | `<SignIn>`, `<SignUp>` components |
| `hooks/useAuthState.ts` | `useAuth()` — `isLoaded`, `isSignedIn`, `getToken` |
| `components/auth/ProtectedRoute.tsx` | `useAuthState` (indirect) |
| `hooks/useDashboard.ts` | `useAuth()` — `getToken` |
| `hooks/useAdmin.ts` | `useAuth()` — `getToken` |
| `pages/OnboardingPage.tsx` | `useAuth()` — `getToken`; `useUser()` — `fullName`, `primaryEmailAddress` |
| `pages/PlanSelectionPage.tsx` | `useAuth()` — `getToken`; `useUser()` |
| `pages/PaymentCallbackPage.tsx` | `useAuth()` — `getToken` |
| `pages/RestaurantDashboardPage.tsx` | `useClerk()` — `signOut` |
| `components/dashboard/DishPhotoUploadModal.tsx` | `useAuth()` — `getToken` |

### Backend — `packages/api/src`

| File | Clerk usage |
|---|---|
| `index.ts` | `clerkMiddleware()` applied globally |
| `middleware/clerkAuth.ts` | `requireClerkAuth` using `getAuth(req).userId` |
| `routes/auth.routes.ts` | `getAuth(req).userId` |
| `routes/subscription.routes.ts` | `getAuth(req).userId` |
| `routes/restaurant.routes.ts` | `getAuth(req).userId` |
| `routes/admin.routes.ts` | `getAuth(req).userId` |

### Database — `packages/api/prisma/schema.prisma`

| Model | Clerk field |
|---|---|
| `RestaurantOwner` | `clerkUserId String @unique` — primary user identity |

---

## New Architecture

### Auth Flow Overview

```
[Browser]
  │
  ├─ Email/Password signup → POST /api/auth/sign-up/email
  │    └─ Better Auth sends verification email → user clicks link
  │    └─ Session created, session cookie set
  │
  ├─ Email/Password signin → POST /api/auth/sign-in/email
  │    └─ Session created, session cookie set
  │
  ├─ Google OAuth → GET /api/auth/sign-in/social?provider=google
  │    └─ Redirect to Google → callback to /api/auth/callback/google
  │    └─ Session created, session cookie set
  │
  └─ All subsequent API calls send session cookie automatically
       └─ Backend reads session via auth.api.getSession(req)
```

### Session vs Token Strategy

Better Auth uses **HTTP-only session cookies** by default (not Bearer tokens in headers). This means:

- `getToken()` pattern on frontend → replaced by session cookie (sent automatically by browser)
- `Authorization: Bearer <token>` on API → replaced by reading session from cookie
- More secure: cookies are HTTP-only (no XSS access), session can be invalidated server-side

For the `getToken()` calls currently used to pass Bearer tokens to the API, we switch to cookie-based auth — the `apiFetch` helper uses `credentials: 'include'` and the API reads the session from the cookie.

---

## New Prisma Schema Additions

Better Auth's Prisma adapter adds these tables alongside existing ones. **Nothing existing is deleted — only additions.**

```prisma
model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime

  sessions  Session[]
  accounts  Account[]
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String    // "google" or "credential"
  userId                String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // bcrypt hash for email/password
  createdAt             DateTime
  updatedAt             DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?
}
```

### Change to `RestaurantOwner`

Rename `clerkUserId` → `userId`, now referencing `User.id`:

```prisma
model RestaurantOwner {
  id           String   @id @default(uuid())
  userId       String   @unique   // was: clerkUserId — now references User.id
  ownerName    String
  email        String?
  restaurantId String   @unique
  createdAt    DateTime @default(now())

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
}
```

---

## Backend Changes

### 1. Install packages

```bash
cd packages/api
npm install better-auth
```

### 2. Create `src/lib/auth.ts` — Better Auth server instance

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // send via nodemailer / Resend / any SMTP
    },
  },
  trustedOrigins: [process.env.WEB_URL || 'http://localhost:3000'],
})
```

### 3. Mount Better Auth handler in `index.ts`

Replace `app.use(clerkMiddleware())` with:

```typescript
import { auth } from './lib/auth'
import { toNodeHandler } from 'better-auth/node'

// Mount all /api/auth/* routes (sign-in, sign-up, OAuth callbacks, sign-out)
app.all('/api/auth/*', toNodeHandler(auth))
```

### 4. Replace `requireClerkAuth` middleware

```typescript
// middleware/auth.ts  (replaces clerkAuth.ts)
import { auth } from '../lib/auth'

export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    return
  }
  res.locals.userId = session.user.id  // was: getAuth(req).userId
  next()
}
```

### 5. Update all routes

Replace `const { userId } = getAuth(req)` → `const userId = res.locals.userId` in:
- `auth.routes.ts`
- `subscription.routes.ts`
- `restaurant.routes.ts`
- `admin.routes.ts`

### 6. New env vars required

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BETTER_AUTH_SECRET=        # random 32-char secret for signing sessions
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@dishdekho.app
```

---

## Frontend Changes

### 1. Install packages

```bash
cd apps/web
npm install better-auth
```

### 2. Create `src/lib/auth-client.ts` — Better Auth React client

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || '',
})

export const {
  useSession,   // replaces useAuth() + useUser()
  signIn,       // replaces Clerk's SignIn component callbacks
  signOut,      // replaces useClerk().signOut()
} = authClient
```

### 3. Replace `ClerkProvider` in `main.tsx`

No provider wrapper needed — Better Auth's client is a standalone module (no React Context required).

Remove `ClerkProvider` entirely from `main.tsx`.

### 4. Replace `useAuthState` hook

```typescript
// hooks/useAuthState.ts — new implementation
import { useSession } from '../lib/auth-client'

export type AuthStatus = 'loading' | 'unauthenticated' | 'needs_onboarding' | 'needs_payment' | 'active'

export function useAuthState(): { status: AuthStatus } {
  const { data: session, isPending } = useSession()
  // ... same logic as before but session replaces isSignedIn
  // getMe() call stays the same to determine onboarding state
}
```

### 5. Replace all `getToken()` calls

`getToken()` returns a Bearer token sent in headers. With Better Auth sessions, cookies are sent automatically. 

Update `apiFetch` in `api/client.ts`:
- Add `credentials: 'include'` to all fetch calls
- Remove `token` parameter and `Authorization` header construction
- All 20+ call sites (`getToken()` → nothing needed) simplify significantly

### 6. Replace `AuthPage.tsx` UI forms

Replace `<SignIn>` and `<SignUp>` Clerk components with custom forms calling:
- `signIn.email({ email, password })` for email/password login
- `signIn.social({ provider: 'google' })` for Google OAuth
- `authClient.signUp.email({ email, password, name })` for registration

Keep the exact same UI design — just swap the Clerk component for the form logic.

### 7. Replace `App.tsx` SSO callback route

Replace `<AuthenticateWithRedirectCallback />` with Better Auth's built-in OAuth callback handling (handled automatically by the `/api/auth/callback/google` route — no frontend component needed).

Remove the `/sso-callback` route from `App.tsx`.

---

## Files Changed Summary

### Deleted
- `packages/api/src/middleware/clerkAuth.ts`

### New files
- `packages/api/src/lib/auth.ts`
- `packages/api/src/middleware/auth.ts`
- `apps/web/src/lib/auth-client.ts`

### Modified
| File | Change |
|---|---|
| `packages/api/prisma/schema.prisma` | Add User/Session/Account/Verification; rename `clerkUserId` → `userId` |
| `packages/api/src/index.ts` | Remove `clerkMiddleware`, mount Better Auth handler |
| `packages/api/src/routes/auth.routes.ts` | `getAuth(req).userId` → `res.locals.userId` |
| `packages/api/src/routes/subscription.routes.ts` | Same |
| `packages/api/src/routes/restaurant.routes.ts` | Same |
| `packages/api/src/routes/admin.routes.ts` | Same |
| `apps/web/src/main.tsx` | Remove `ClerkProvider` |
| `apps/web/src/App.tsx` | Remove `/sso-callback` route; remove Clerk imports |
| `apps/web/src/hooks/useAuthState.ts` | Use `useSession` instead of `useAuth` |
| `apps/web/src/hooks/useDashboard.ts` | Remove `getToken`, use cookie auth |
| `apps/web/src/hooks/useAdmin.ts` | Remove `getToken`, use cookie auth |
| `apps/web/src/pages/AuthPage.tsx` | Replace `<SignIn>`/`<SignUp>` with custom forms |
| `apps/web/src/pages/OnboardingPage.tsx` | `useUser()` → `useSession().data.user` |
| `apps/web/src/pages/PlanSelectionPage.tsx` | Same |
| `apps/web/src/pages/PaymentCallbackPage.tsx` | Remove `getToken` |
| `apps/web/src/pages/RestaurantDashboardPage.tsx` | `useClerk().signOut` → `signOut()` |
| `apps/web/src/components/dashboard/DishPhotoUploadModal.tsx` | Remove `getToken` |
| `apps/web/src/api/client.ts` | Add `credentials: 'include'`, remove token param |

### Removed packages
- `@clerk/react` (frontend)
- `@clerk/express` (backend)

### Added packages
- `better-auth` (both frontend and backend — same package)

---

## Migration Steps (ordered)

1. **Set up Google OAuth credentials** — Google Cloud Console → create OAuth2 app → get `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
2. **Set up SMTP** — Resend.com (free tier, easiest) or Gmail SMTP for email verification
3. **Backend first** — add Better Auth, update schema, replace middleware, run migrations
4. **Frontend second** — add auth client, replace hooks, replace auth UI
5. **Remove Clerk packages** — once all usages replaced
6. **Test full flow** — signup → verify email → onboarding → payment → dashboard → Google OAuth path
7. **Update Vercel env vars** — remove Clerk vars, add new ones
8. **Update Render env vars** — same

---

## Risks & Notes

- **CORS + cookies:** Better Auth uses `SameSite=Lax` cookies. For cross-origin requests (frontend on Vercel, API on Render), cookies need `SameSite=None; Secure`. Set `better-auth` option `advanced.crossSubDomainCookies` or configure `cookieOptions` explicitly.
- **Google OAuth redirect URI:** Must register `https://menuar-mnmd.onrender.com/api/auth/callback/google` in Google Cloud Console.
- **No `@ts-ignore` needed:** Better Auth is fully typed.
- **Admin auth:** `requireAdminAuth` (JWT-based for admin panel) is already separate from Clerk and stays unchanged.
