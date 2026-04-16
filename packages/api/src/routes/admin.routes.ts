import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth } from '../middleware/auth';
import { saveFile, deleteFile } from '../services/storage.service';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const glbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 }, // 25MB for GLB
  fileFilter: (_req, file, cb) => {
    const isGlb =
      file.originalname.toLowerCase().endsWith('.glb') ||
      file.mimetype === 'model/gltf-binary' ||
      file.mimetype === 'application/octet-stream';
    if (!isGlb) {
      cb(new Error('Only GLB files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

/** POST /api/v1/admin/login */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
    
  // Check if email matches whitelist and password matches env
  if (!email || !password || !ADMIN_EMAILS.includes(email.toLowerCase()) || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid admin credentials', code: 'UNAUTHORIZED' });
    return;
  }

  // Generate JWT token
  const token = jwt.sign(
    { email: email.toLowerCase(), role: 'admin' }, 
    process.env.JWT_SECRET || 'fallback-secret', 
    { expiresIn: '7d' }
  );

  res.json({ token });
});

/** GET /api/v1/admin/stats */
router.get('/stats', requireAdminAuth, async (_req, res) => {
  const [totalRegistered, totalPaid, scanSum] = await Promise.all([
    prisma.restaurantOwner.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.restaurant.aggregate({ _sum: { scanCount: true } }),
  ]);

  res.json({
    totalRegistered,
    totalPaid,
    leads: totalRegistered - totalPaid,
    totalQrScans: scanSum._sum.scanCount ?? 0,
  });
});

/** GET /api/v1/admin/restaurants */
router.get('/restaurants', requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as string | undefined;

  const where =
    status === 'paid'
      ? { subscription: { status: 'active' as const } }
      : status === 'lead'
        ? { subscription: null }
        : {};

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      include: {
        owner: true,
        subscription: true,
        slots: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);

  const data = restaurants.map((r) => ({
    restaurant: {
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: r.plan,
      qrUrl: r.qrUrl,
      scanCount: r.scanCount,
      createdAt: r.createdAt,
    },
    owner: r.owner
      ? { id: r.owner.id, ownerName: r.owner.ownerName, email: r.owner.email }
      : null,
    subscription: r.subscription
      ? { status: r.subscription.status, activatedAt: r.subscription.activatedAt }
      : null,
    slotsReady: r.slots.filter((s) => s.status === 'glb_ready').length,
    slotsWithPhotos: r.slots.filter(
      (s) => s.status === 'photos_uploaded' || s.status === 'processing',
    ).length,
  }));

  res.json({ data, total, page, limit });
});

/** GET /api/v1/admin/restaurants/:restaurantId/slots */
router.get('/restaurants/:restaurantId/slots', requireAdminAuth, async (req, res) => {
  const slots = await prisma.dishSlot.findMany({
    where: { restaurantId: req.params.restaurantId },
    orderBy: { slotNumber: 'asc' },
  });

  const isR2 = process.env.USE_R2 === 'true';
  const baseUrl = isR2
    ? (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
    : (process.env.SERVER_URL || `http://localhost:${process.env.PORT ?? 3001}`);
  const slotsWithUrls = slots.map((slot) => ({
    ...slot,
    photoUrls: slot.photoKeys.map((k) => isR2 ? `${baseUrl}/${k}` : `${baseUrl}/uploads/${k}`),
  }));

  res.json({ slots: slotsWithUrls });
});

/** POST /api/v1/admin/slots/:slotId/glb — upload GLB and mark slot ready */
router.post('/slots/:slotId/glb', requireAdminAuth, glbUpload.single('glb'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No GLB file provided', code: 'NO_FILE' });
    return;
  }

  const slot = await prisma.dishSlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot) {
    res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
    return;
  }

  // Delete old GLB if exists
  if (slot.glbKey) {
    await deleteFile(slot.glbKey).catch(() => {});
  }

  const { key, url } = await saveFile(
    `models/${slot.restaurantId}/slot-${slot.slotNumber}`,
    'dish.glb',
    file.buffer,
  );

  const body = req.body as Record<string, string>;
  const updated = await prisma.dishSlot.update({
    where: { id: slot.id },
    data: {
      glbKey: key,
      glbUrl: url,
      status: 'glb_ready',
      ...(body.dishName && { dishName: body.dishName }),
      ...(body.description && { description: body.description }),
      ...(body.ingredients && { ingredients: body.ingredients }),
      ...(body.price && { price: parseFloat(body.price) }),
      ...(body.isVeg !== undefined && { isVeg: body.isVeg === 'true' }),
    },
  });

  res.json({ slotId: updated.id, glbUrl: updated.glbUrl, status: updated.status });
});

const SlotUpdateSchema = z.object({
  dishName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  ingredients: z.string().max(1000).optional(),
  price: z.number().positive().optional(),
  isVeg: z.boolean().optional(),
});

/** PUT /api/v1/admin/slots/:slotId — update dish metadata for a slot */
router.put('/slots/:slotId', requireAdminAuth, async (req, res) => {
  const parsed = SlotUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
    return;
  }

  const slot = await prisma.dishSlot.findUnique({ where: { id: req.params.slotId } });
  if (!slot) {
    res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
    return;
  }

  const updated = await prisma.dishSlot.update({
    where: { id: slot.id },
    data: parsed.data,
  });

  res.json({ slot: updated });
});

/** POST /api/v1/admin/restaurants/:restaurantId/regenerate-qr */
router.post('/restaurants/:restaurantId/regenerate-qr', requireAdminAuth, async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.restaurantId },
    select: { id: true, slug: true },
  });
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found', code: 'NOT_FOUND' });
    return;
  }

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const arUrl = `${BASE_URL}/ar/${restaurant.slug}`;

  const QRCode = (await import('qrcode')).default;
  const qrBuffer = await QRCode.toBuffer(arUrl, { width: 512, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
  const { url } = await saveFile(`qr/${restaurant.id}`, 'main.png', qrBuffer);

  await prisma.restaurant.update({ where: { id: restaurant.id }, data: { qrUrl: url } });

  res.json({ qrUrl: url, arUrl });
});

/** GET /api/v1/admin/events — all payment events */
router.get('/events', requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  const [total, events] = await Promise.all([
    prisma.paymentEvent.count(),
    prisma.paymentEvent.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        subscription: {
          include: {
            restaurant: {
              select: { name: true, slug: true },
            },
          },
        },
      },
    }),
  ]);

  // Attach owner email per event via restaurant
  const restaurantIds = [...new Set(events.map(e => e.subscription.restaurantId))];
  const owners = await prisma.restaurantOwner.findMany({
    where: { restaurantId: { in: restaurantIds } },
    select: { restaurantId: true, ownerName: true, email: true },
  });
  const ownerMap = Object.fromEntries(owners.map(o => [o.restaurantId, o]));

  const enriched = events.map(e => ({
    id: e.id,
    eventType: e.eventType,
    createdAt: e.createdAt,
    razorpayEventId: e.razorpayEventId,
    subscription: {
      id: e.subscription.id,
      status: e.subscription.status,
      amount: e.subscription.amount,
      planType: e.subscription.razorpayPlanId,
      restaurant: e.subscription.restaurant,
      owner: ownerMap[e.subscription.restaurantId] || null,
    },
  }));

  res.json({ events: enriched, total, page, limit });
});

export default router;
