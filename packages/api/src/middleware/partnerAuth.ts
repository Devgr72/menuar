import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Partner } from '../db/models/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      partner?: {
        id: string;
        partnerId: string;
      };
    }
  }
}

export const requirePartnerAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) acc[name] = rest.join('=');
        return acc;
      }, {} as Record<string, string>);
      token = cookies['partnerToken'];
    }
    
    if (!token) {
      res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    if (decoded.role !== 'partner') {
      res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      return;
    }

    const partner = await Partner.findById(decoded.id).select('_id partnerId status');
    
    if (!partner || partner.status !== 'Active') {
      res.status(403).json({ error: 'Partner account is inactive or not found', code: 'FORBIDDEN' });
      return;
    }

    req.partner = {
      id: partner._id.toString(),
      partnerId: partner.partnerId
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
};
