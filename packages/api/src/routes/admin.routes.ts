import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth } from '../middleware/clerkAuth';
import { saveFile, deleteFile } from '../services/storage.service';
import { z } from 'zod';

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

  res.json({ slots });
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
      ...(body.price && { price: parseFloat(body.price) }),
      ...(body.isVeg !== undefined && { isVeg: body.isVeg === 'true' }),
    },
  });

  res.json({ slotId: updated.id, glbUrl: updated.glbUrl, status: updated.status });
});

const SlotUpdateSchema = z.object({
  dishName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
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

/** GET /api/v1/admin/events — last 20 payment events for activity feed */
router.get('/events', requireAdminAuth, async (_req, res) => {
  const events = await prisma.paymentEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      subscription: {
        include: { restaurant: { select: { name: true, slug: true } } },
      },
    },
  });

  res.json({ events });
});

export default router;
