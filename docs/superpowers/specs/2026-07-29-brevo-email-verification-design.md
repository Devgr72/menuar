# Brevo Email Verification — Design Spec

**Date:** 2026-07-29
**Status:** Approved for planning

## Problem

Signup uses better-auth's built-in `emailAndPassword` flow. A `sendVerificationEmail` hook already exists in `packages/api/src/lib/auth.ts`, but it's a nodemailer/SMTP stub that `console.log`s the verify URL instead of sending in dev, and neither `sendOnSignUp` nor `requireEmailVerification` is set — so today, no verification email is ever sent automatically, and an unverified email/password account can sign in and use the app exactly like a verified one. The frontend has no "check your email" step and no `/verify-email` landing page.

We want: real verification emails sent via Brevo, sign-in blocked until verified, and a coherent frontend flow around it.

## Scope

- Backend: swap the email transport in the existing better-auth hook for Brevo's Transactional Email API, turn on enforcement flags.
- Frontend: add a post-signup "check your email" state, a resend affordance on blocked sign-in, and a `/verify-email` landing page.
- Out of scope: Google OAuth signups (already provider-verified, untouched by this change), any new custom Mongoose models (better-auth's Mongo adapter already persists verification tokens; no new DB schema needed), branded Brevo email templates beyond a simple HTML email (can be layered on later).

## Architecture

Better-auth already owns the full verification lifecycle — token generation, expiry, storage in its own `verification` Mongo collection, and rate limiting on resend — via its MongoDB adapter (`packages/api/src/lib/auth.ts`, `mongodbAdapter(db, { client })` from `getNativeDb()` in `packages/api/src/db/connection.ts`). This feature is a **transport swap + enforcement toggle + frontend UX**, not a from-scratch build:

1. Replace the nodemailer/SMTP stub with a real Brevo API call.
2. Set `emailVerification.sendOnSignUp: true` and `emailAndPassword.requireEmailVerification: true` so the email actually fires on signup and sign-in is blocked pre-verification.
3. Close the frontend gap: today `AuthPage.tsx` redirects straight to `/onboarding` 1.8s after signup assuming a session now exists — with enforcement on, no session is issued until verified, so this redirect must become a "check your email" screen instead. Sign-in must also handle the new `EMAIL_NOT_VERIFIED` error case. A new `/verify-email` route handles the emailed link's redirect target.

Google-social signups are unaffected: better-auth trusts the IdP's own email verification and does not apply `requireEmailVerification` to the social flow.

## Components

### Backend (`packages/api/src`)

- **`services/email.service.ts`** (new) — wraps `@getbrevo/brevo`'s `TransactionalEmailsApi`. Exports `sendVerificationEmail(to: string, name: string, url: string): Promise<void>`. Follows the same fail-loud-on-missing-config convention as `services/r2.service.ts` (`isR2Configured()` pattern) — export an `isBrevoConfigured()` check.
- **`index.ts`** — add a Brevo config check alongside the existing R2 check in `main()`, so the server refuses to boot with verification enforced but no working mailer (mirrors the existing `isR2Configured()` guard).
- **`lib/auth.ts`** — `emailVerification.sendVerificationEmail` calls the new service instead of constructing a nodemailer transport inline. Add `sendOnSignUp: true`, `expiresIn: 60 * 60 * 24` (24h). Add `emailAndPassword.requireEmailVerification: true`.
- **`package.json`** — remove `nodemailer` + `@types/nodemailer` (no longer used anywhere else in the codebase — confirmed via repo-wide grep), add `@getbrevo/brevo`.
- **Env vars** (`.env`, `.env.example`) — remove `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.

### Frontend (`apps/web/src`)

- **`pages/AuthPage.tsx`**:
  - Sign-up branch: pass `callbackURL: '<origin>/verify-email'` to `authClient.signUp.email(...)`. Replace the "Account created! Setting up your workspace…" + hard redirect with a persistent "Verify your email" screen (shows the submitted email, explains a link was sent, offers a "Resend email" button calling `authClient.sendVerificationEmail({ email, callbackURL })`).
  - Sign-in branch: catch the `EMAIL_NOT_VERIFIED` error code from `authClient.signIn.email(...)` and render the same "check your email" / resend UI instead of a generic error toast.
- **New page + route: `/verify-email`** — added to the router in `App.tsx`. Better-auth's `GET /api/auth/verify-email` endpoint validates the token and redirects the browser here with either no error param (success) or `?error=...` (expired/invalid token). The page reads that query param and shows a success state (link to `/sign-in`) or a failure state (message + a way to trigger resend, e.g. link back to sign-in where resend lives).
- **`hooks/useAuthState.ts`** — no change needed. Its state machine is session-driven (`unauthenticated → needs_onboarding → needs_payment → active`); since an unverified user never gets a session under `requireEmailVerification: true`, they simply never leave `unauthenticated` until they verify and sign in — no new state required.

## Data flow

1. Sign-up form submit → `authClient.signUp.email({ email, password, name, callbackURL: '<WEB_URL>/verify-email' })`.
2. Better-auth creates the `user` doc (`emailVerified: false`), writes a token to its `verification` collection, and — since `sendOnSignUp: true` — invokes `sendVerificationEmail`, which calls Brevo's API. No session is issued (blocked by `requireEmailVerification`).
3. Frontend shows the "check your email" screen instead of redirecting to onboarding.
4. User clicks the emailed link → `GET /api/auth/verify-email?token=...&callbackURL=<WEB_URL>/verify-email` → better-auth validates + expires the token, sets `emailVerified: true`, redirects to the callback URL.
5. `/verify-email` page shows success; user navigates to `/sign-in`, signs in normally, session issues, and the existing onboarding flow (`OnboardingPage.tsx` → `POST /api/v1/auth/register` → Restaurant/RestaurantOwner/DishSlot creation, unchanged) proceeds as before.

## Error handling

- **Missing Brevo config at boot** (`BREVO_API_KEY` / `BREVO_SENDER_EMAIL` unset) → `main()` throws immediately at startup, same pattern as the existing R2 check, so this can never silently degrade to a no-op in production the way the old `if (!SMTP_HOST)` stub did.
- **Brevo API call fails** during signup (network error, 4xx from Brevo) → the hook rejects, better-auth surfaces an error from `sign-up/email`; frontend shows "couldn't send verification email — try resending" rather than a raw 500, and the account still exists so a resend can succeed once the transient issue clears.
- **Expired/invalid token** on `/verify-email` → better-auth redirects with an `error` query param; page shows a clear "link expired" message and directs the user back to sign-in, where the blocked-sign-in flow's resend button will issue a fresh link.
- **Resend abuse** → handled entirely by better-auth's built-in endpoint rate limiting; no custom throttling code needed.

## Testing

- Manual end-to-end in dev with a real Brevo sandbox/test API key: sign up → confirm the email actually arrives via Brevo → click the link → confirm `emailVerified: true` on the user doc in MongoDB Atlas → sign in succeeds → onboarding proceeds normally.
- Manual: attempt to sign in on an unverified account → confirm it's blocked and the resend affordance works and delivers a second email.
- Manual: visit `/verify-email` with a deliberately expired/garbage token → confirm the friendly failure state renders (not a crash or blank page).
- Manual: Google OAuth sign-in still works unaffected (no verification-email detour).
