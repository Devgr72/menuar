import { getAuth } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { email?: string };
    
    if (!payload.email || !ADMIN_EMAILS.includes(payload.email)) {
      res.status(403).json({ error: 'Forbidden', code: 'ADMIN_ONLY' });
      return;
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
}
