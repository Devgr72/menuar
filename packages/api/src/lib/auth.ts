import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { getNativeDb } from '../db/connection.js'
import { sendVerificationOTPEmail } from '../services/email.service.js'

const { db, client } = getNativeDb()

// Keep in sync with the CORS allowlist in index.ts — trustedOrigins also derives
// the session cookie's Domain attribute (see advanced.crossSubDomainCookies below),
// so a missing production origin here silently drops the cookie on that domain.
const WEB_URL = process.env.WEB_URL || 'https://dishdekho.com';

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: `${WEB_URL}/api/auth`,

  emailAndPassword: { enabled: true, requireEmailVerification: true },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      overrideDefaultEmailVerification: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        console.log(`[auth] sending OTP ${otp} to ${email} (type: ${type})`)
        try {
          await sendVerificationOTPEmail(email, otp)
          console.log(`[auth] successfully sent OTP email to ${email}`);
        } catch (err) {
          console.error(`[auth] failed to send OTP email:`, err);
        }
      },
    }),
  ],

  trustedOrigins: [
    WEB_URL,
    'https://dishdekho.com',
    'https://www.dishdekho.com',
    'https://menuar-web.vercel.app',
    'http://localhost:3000',
    'https://localhost:3000',
  ],

  advanced: {
    trustHost: true,
    crossSubDomainCookies: { enabled: true },
    cookiePrefix: 'dishdekho',
  },
})
