import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { getNativeDb } from '../db/connection.js'
import { sendVerificationOTPEmail } from '../services/email.service.js'

const { db, client } = getNativeDb()

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: `${process.env.WEB_URL || 'https://menuar-web.vercel.app'}/api/auth`,

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
        if (type === 'email-verification') await sendVerificationOTPEmail(email, otp)
      },
    }),
  ],

  trustedOrigins: [
    process.env.WEB_URL || 'https://menuar-web.vercel.app',
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
