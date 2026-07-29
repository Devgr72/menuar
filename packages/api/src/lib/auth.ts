import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import nodemailer from 'nodemailer'
import { getNativeDb } from '../db/connection.js'

const { db, client } = getNativeDb()

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: `${process.env.WEB_URL || 'https://menuar-web.vercel.app'}/api/auth`,

  emailAndPassword: { enabled: true },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (!process.env.SMTP_HOST) {
        // Skip email in dev if SMTP not configured
        console.log(`[auth] Verification email for ${user.email}: ${url}`)
        return
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@dishdekho.app',
        to: user.email,
        subject: 'Verify your DishDekho email',
        html: `<p>Click to verify your email: <a href="${url}">${url}</a></p>`,
      })
    },
  },

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
