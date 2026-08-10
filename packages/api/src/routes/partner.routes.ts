import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

import crypto from 'crypto';
import { requirePartnerAuth } from '../middleware/partnerAuth.js';
import { Partner, PartnerCommission, Restaurant, Subscription } from '../db/models/index.js';

const router = Router();

// Validate input
const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  email: z.string().email('Invalid email address'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  qualification: z.string().min(1, 'Qualification is required'),
  college: z.string().optional(),
  currentStatus: z.string().min(1, 'Current status is required'),
  salesExperience: z.string().min(1, 'Sales experience is required'),
  dailyTime: z.string().min(1, 'Daily time is required'),
  preferredMethod: z.string().min(1, 'Preferred method is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check for existing
    const existing = await Partner.findOne({
      $or: [{ email: data.email }, { mobileNumber: data.mobileNumber }]
    });

    if (existing) {
      if (existing.email === data.email) {
        res.status(400).json({ error: 'Email is already registered.' });
        return;
      }
      if (existing.mobileNumber === data.mobileNumber) {
        res.status(400).json({ error: 'Mobile number is already registered.' });
        return;
      }
    }

    const partnerId = `PRT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const passwordHash = hashPassword(data.password);

    const partner = new Partner({
      partnerId,
      fullName: data.fullName,
      mobileNumber: data.mobileNumber,
      email: data.email,
      city: data.city,
      state: data.state,
      qualification: data.qualification,
      college: data.college,
      currentStatus: data.currentStatus,
      salesExperience: data.salesExperience,
      dailyTime: data.dailyTime,
      preferredMethod: data.preferredMethod,
      passwordHash,
      status: 'Active',
    });

    await partner.save();

    const token = jwt.sign(
      { id: partner._id, partnerId: partner.partnerId, role: 'partner' },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.cookie('partnerToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ ok: true, partnerId });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error('Partner Registration Error:', err);
    res.status(500).json({ error: 'Failed to register partner.' });
  }
});

const loginSchema = z.object({
  emailOrMobile: z.string().min(1, 'Email or Mobile is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const partner = await Partner.findOne({
      $or: [{ email: data.emailOrMobile }, { mobileNumber: data.emailOrMobile }]
    });

    if (!partner) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const [salt, storedHash] = partner.passwordHash.split(':');
    const hash = crypto.pbkdf2Sync(data.password, salt, 10000, 64, 'sha512').toString('hex');

    if (hash !== storedHash) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign(
      { id: partner._id, partnerId: partner.partnerId, role: 'partner' },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('partnerToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ ok: true, partnerId: partner.partnerId });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    console.error('Partner Login Error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('partnerToken');
  res.json({ ok: true });
});

// -- Protected Routes --

router.use(requirePartnerAuth);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const partner = await Partner.findOne({ partnerId: req.partner!.partnerId }).lean();
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' });
      return;
    }
    res.json({ partner: { ...partner, id: partner._id } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const partnerId = req.partner!.partnerId;

    const [restaurants, commissions] = await Promise.all([
      Restaurant.find({ partnerId }).lean(),
      PartnerCommission.find({ partnerId }).sort({ createdAt: -1 }).lean()
    ]);

    const restIds = restaurants.map(r => r._id);
    const activeSubs = await Subscription.find({ restaurantId: { $in: restIds }, status: 'active' }).lean();
    const activeRestIds = new Set(activeSubs.map(s => s.restaurantId));

    const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pendingEarnings = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0);
    const paidEarnings = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);

    const stats = {
      totalRestaurants: restaurants.length,
      activeRestaurants: activeRestIds.size,
      totalEarnings,
      pendingEarnings,
      paidEarnings
    };

    const enrichedRestaurants = restaurants.map(r => ({
      id: r._id,
      name: r.name,
      status: activeRestIds.has(r._id as string) ? 'Active' : 'Pending',
      createdAt: r.createdAt
    }));

    // Fetch restaurant names for commissions context
    const restMap = Object.fromEntries(restaurants.map(r => [r._id, r.name]));
    const enrichedCommissions = commissions.map(c => ({
      id: c._id,
      date: c.createdAt,
      restaurantName: restMap[c.restaurantId] || 'Unknown',
      type: c.type,
      amount: c.amount,
      status: c.status
    }));

    res.json({
      stats,
      restaurants: enrichedRestaurants,
      commissions: enrichedCommissions
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
