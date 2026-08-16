import { Router } from 'express';
import multer from 'multer';
import { Restaurant, RestaurantOwner, Subscription, DishSlot, PaymentEvent, Inquiry, Partner } from '../db/models/index.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { saveFile, deleteFile } from '../services/storage.service.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { toId, toIds } from '../db/serialize.js';

const router = Router();

const modelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 2 }, // 25MB per file (GLB + USDZ)
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (file.fieldname === 'glb') {
      const isGlb =
        name.endsWith('.glb') ||
        file.mimetype === 'model/gltf-binary' ||
        file.mimetype === 'application/octet-stream';
      if (!isGlb) return cb(new Error('The "glb" field must be a .glb file'));
      return cb(null, true);
    }
    if (file.fieldname === 'usdz') {
      const isUsdz =
        name.endsWith('.usdz') ||
        file.mimetype === 'model/vnd.usdz+zip' ||
        file.mimetype === 'application/octet-stream';
      if (!isUsdz) return cb(new Error('The "usdz" field must be a .usdz file'));
      return cb(null, true);
    }
    cb(new Error(`Unexpected field: ${file.fieldname}`));
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
    { expiresIn: '7d' },
  );

  res.json({ token });
});

/** GET /api/v1/admin/stats */
router.get('/stats', requireAdminAuth, async (_req, res) => {
  const [totalRegistered, totalPaid, scanAgg, newInquiries, totalPartners] = await Promise.all([
    RestaurantOwner.countDocuments(),
    Subscription.countDocuments({ status: 'active' }),
    Restaurant.aggregate([{ $group: { _id: null, total: { $sum: '$scanCount' } } }]),
    Inquiry.countDocuments({ status: 'new' }),
    Partner.countDocuments(),
  ]);

  res.json({
    totalRegistered,
    totalPaid,
    leads: totalRegistered - totalPaid,
    totalQrScans: scanAgg[0]?.total ?? 0,
    newInquiries,
    totalPartners,
  });
});

/** GET /api/v1/admin/inquiries — contact form messages and newsletter sign-ups */
router.get('/inquiries', requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const { type, status } = req.query as { type?: string; status?: string };

  const filter: Record<string, unknown> = {};
  if (type === 'contact' || type === 'newsletter') filter.type = type;
  if (status === 'new' || status === 'read' || status === 'archived') filter.status = status;

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .select('-ip')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  res.json({ data: toIds(inquiries), total, page, limit });
});

/** PATCH /api/v1/admin/inquiries/:id — mark read or archived */
router.patch('/inquiries/:id', requireAdminAuth, async (req, res) => {
  const parsed = z.object({ status: z.enum(['new', 'read', 'archived']) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status', code: 'INVALID_INPUT' });
    return;
  }

  const updated = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true },
  )
    .select('-ip')
    .lean();

  if (!updated) {
    res.status(404).json({ error: 'Inquiry not found', code: 'NOT_FOUND' });
    return;
  }

  res.json({ inquiry: toId(updated) });
});

/** GET /api/v1/admin/restaurants */
router.get('/restaurants', requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as string | undefined;

  const filter: Record<string, unknown> = {};
  if (status === 'paid') {
    const activeSubs = await Subscription.find({ status: 'active' }).select('restaurantId').lean();
    filter._id = { $in: activeSubs.map((s) => s.restaurantId) };
  } else if (status === 'lead') {
    const allSubs = await Subscription.find({}).select('restaurantId').lean();
    filter._id = { $nin: allSubs.map((s) => s.restaurantId) };
  }

  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Restaurant.countDocuments(filter),
  ]);

  const restaurantIds = restaurants.map((r) => r._id);
  const [owners, subs, slots] = await Promise.all([
    RestaurantOwner.find({ restaurantId: { $in: restaurantIds } }).lean(),
    Subscription.find({ restaurantId: { $in: restaurantIds } }).lean(),
    DishSlot.find({ restaurantId: { $in: restaurantIds } }).select('restaurantId status').lean(),
  ]);

  const ownerMap = Object.fromEntries(owners.map((o) => [o.restaurantId, o]));
  const subMap = Object.fromEntries(subs.map((s) => [s.restaurantId, s]));
  const slotsMap: Record<string, { status: string }[]> = {};
  for (const s of slots) {
    (slotsMap[s.restaurantId] ??= []).push({ status: s.status });
  }

  const data = restaurants.map((r) => {
    const owner = ownerMap[r._id];
    const subscription = subMap[r._id];
    const rSlots = slotsMap[r._id] || [];
    return {
      restaurant: {
        id: r._id,
        name: r.name,
        slug: r.slug,
        plan: r.plan,
        qrUrl: r.qrUrl,
        scanCount: r.scanCount,
        createdAt: r.createdAt,
      },
      owner: owner ? { id: owner._id, ownerName: owner.ownerName, email: owner.email } : null,
      subscription: subscription ? { status: subscription.status, activatedAt: subscription.activatedAt } : null,
      slotsReady: rSlots.filter((s) => s.status === 'glb_ready').length,
      slotsWithPhotos: rSlots.filter((s) => s.status === 'photos_uploaded' || s.status === 'processing').length,
    };
  });

  res.json({ data, total, page, limit });
});

/** GET /api/v1/admin/restaurants/:restaurantId/slots */
router.get('/restaurants/:restaurantId/slots', requireAdminAuth, async (req, res) => {
  const slots = await DishSlot.find({ restaurantId: req.params.restaurantId }).sort({ slotNumber: 1 }).lean();

  const baseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const slotsWithUrls = toIds(slots).map((slot) => ({
    ...slot,
    photoUrls: slot.photoKeys.map((k) => `${baseUrl}/${k}`),
  }));

  res.json({ slots: slotsWithUrls });
});

/** POST /api/v1/admin/slots/:slotId/glb — upload GLB + USDZ pair and mark slot ready */
router.post(
  '/slots/:slotId/glb',
  requireAdminAuth,
  modelUpload.fields([
    { name: 'glb', maxCount: 1 },
    { name: 'usdz', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as { glb?: Express.Multer.File[]; usdz?: Express.Multer.File[] } | undefined;
    const glbFile = files?.glb?.[0];
    const usdzFile = files?.usdz?.[0];

    if (!glbFile) {
      res.status(400).json({ error: 'No GLB file provided', code: 'NO_FILE' });
      return;
    }
    if (!usdzFile) {
      res.status(400).json({ error: 'No USDZ file provided', code: 'NO_FILE' });
      return;
    }

    const slot = await DishSlot.findById(req.params.slotId);
    if (!slot) {
      res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
      return;
    }

    // Delete old model files if they exist
    if (slot.glbKey) await deleteFile(slot.glbKey).catch(() => {});
    if (slot.usdzKey) await deleteFile(slot.usdzKey).catch(() => {});

    const dir = `models/${slot.restaurantId}/slot-${slot.slotNumber}`;
    const [{ key: glbKey, url: glbUrl }, { key: usdzKey, url: usdzUrl }] = await Promise.all([
      saveFile(dir, 'dish.glb', glbFile.buffer),
      saveFile(dir, 'dish.usdz', usdzFile.buffer),
    ]);

    const body = req.body as Record<string, string>;
    const updated = await DishSlot.findByIdAndUpdate(
      slot._id,
      {
        glbKey,
        glbUrl,
        usdzKey,
        usdzUrl,
        status: 'glb_ready',
        ...(body.dishName && { dishName: body.dishName }),
        ...(body.description && { description: body.description }),
        ...(body.ingredients && { ingredients: body.ingredients }),
        ...(body.price && { price: parseFloat(body.price) }),
        ...(body.isVeg !== undefined && { isVeg: body.isVeg === 'true' }),
      },
      { new: true },
    ).lean();

    res.json({ slotId: updated!._id, glbUrl: updated!.glbUrl, usdzUrl: updated!.usdzUrl, status: updated!.status });
  },
);

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

  const slot = await DishSlot.findById(req.params.slotId);
  if (!slot) {
    res.status(404).json({ error: 'Slot not found', code: 'NOT_FOUND' });
    return;
  }

  const updated = await DishSlot.findByIdAndUpdate(slot._id, parsed.data, { new: true }).lean();

  res.json({ slot: updated ? toId(updated) : null });
});

/** POST /api/v1/admin/restaurants/:restaurantId/regenerate-qr */
router.post('/restaurants/:restaurantId/regenerate-qr', requireAdminAuth, async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.restaurantId).select('_id slug').lean();
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found', code: 'NOT_FOUND' });
    return;
  }

  const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
  const arUrl = `${WEB_URL}/ar/${restaurant.slug}`;

  const QRCodeLib = (await import('qrcode')).default;
  const qrBuffer = await QRCodeLib.toBuffer(arUrl, { width: 512, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
  const { url } = await saveFile(`qr/${restaurant._id}`, 'main.png', qrBuffer);

  await Restaurant.updateOne({ _id: restaurant._id }, { qrUrl: url });

  res.json({ qrUrl: url, arUrl });
});

/** GET /api/v1/admin/events — all payment events */
router.get('/events', requireAdminAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  const [total, events] = await Promise.all([
    PaymentEvent.countDocuments(),
    PaymentEvent.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const subscriptionIds = [...new Set(events.map((e) => e.subscriptionId))];
  const subs = await Subscription.find({ _id: { $in: subscriptionIds } }).lean();
  const subMap = Object.fromEntries(subs.map((s) => [s._id, s]));

  const restaurantIds = [...new Set(subs.map((s) => s.restaurantId))];
  const [restaurants, owners] = await Promise.all([
    Restaurant.find({ _id: { $in: restaurantIds } }).select('name slug').lean(),
    RestaurantOwner.find({ restaurantId: { $in: restaurantIds } }).select('restaurantId ownerName email').lean(),
  ]);
  const restaurantMap = Object.fromEntries(restaurants.map((r) => [r._id, { name: r.name, slug: r.slug }]));
  const ownerMap = Object.fromEntries(owners.map((o) => [o.restaurantId, o]));

  const enriched = events.map((e) => {
    const sub = subMap[e.subscriptionId];
    return {
      id: e._id,
      eventType: e.eventType,
      createdAt: e.createdAt,
      razorpayEventId: e.razorpayEventId,
      subscription: sub
        ? {
            id: sub._id,
            status: sub.status,
            amount: sub.amount,
            planType: sub.razorpayPlanId,
            restaurant: restaurantMap[sub.restaurantId] || null,
            owner: ownerMap[sub.restaurantId] || null,
          }
        : null,
    };
  });

  res.json({ events: enriched, total, page, limit });
});

export default router;
