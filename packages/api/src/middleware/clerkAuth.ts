import { getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function requireClerkAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }
  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId, sessionClaims } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const email = (sessionClaims?.email as string | undefined)?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Forbidden', code: 'ADMIN_ONLY' });
    return;
  }
  next();
}
