import type { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/auth'
import jwt from 'jsonwebtoken'
import { fromNodeHeaders } from 'better-auth/node'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    return
  }
  res.locals.userId = session.user.id
  next()
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { email?: string }

    if (!payload.email || !ADMIN_EMAILS.includes(payload.email)) {
      res.status(403).json({ error: 'Forbidden', code: 'ADMIN_ONLY' })
      return
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' })
  }
}
