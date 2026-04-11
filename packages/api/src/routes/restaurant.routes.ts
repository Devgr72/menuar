import { Router } from 'express';
import { getAuth } from '@clerk/express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { requireClerkAuth } from '../middleware/clerkAuth';
import { saveFile } from '../services/storage.service';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 4 }, // 10MB each, max 4
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

/** GET /api/v1/restaurant/dashboard */
router.get('/dashboard', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const owner = await prisma.restaurantOwner.findUnique({
      where: { clerkUserId: userId },
      include: {
        restaurant: {
          include: {
            subscription: true,
            slots: { orderBy: { slotNumber: 'asc' } },
          },
        },
      },
    });

    if (!owner) {
      res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
      return;
    }

    res.json({
      owner: {
        id: owner.id,
        ownerName: owner.ownerName,
        email: owner.email,
        restaurantId: owner.restaurantId,
        createdAt: owner.createdAt,
      },
      restaurant: {
        id: owner.restaurant.id,
        name: owner.restaurant.name,
        slug: owner.restaurant.slug,
        plan: owner.restaurant.plan,
        qrUrl: owner.restaurant.qrUrl,
        scanCount: owner.restaurant.scanCount,
        createdAt: owner.restaurant.createdAt,
      },
      subscription: owner.restaurant.subscription
        ? {
            id: owner.restaurant.subscription.id,
            status: owner.restaurant.subscription.status,
            amount: owner.restaurant.subscription.amount,
            activatedAt: owner.restaurant.subscription.activatedAt,
            nextBillingAt: owner.restaurant.subscription.nextBillingAt,
            haltedAt: owner.restaurant.subscription.haltedAt,
          }
        : null,
      slots: owner.restaurant.slots,
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ error: 'Failed to load dashboard', code: 'DASHBOARD_ERROR', details: String(err) });
  }
});

/** GET /api/v1/restaurant/slots */
router.get('/slots', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const owner = await prisma.restaurantOwner.findUnique({ where: { clerkUserId: userId } });
  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  const slots = await prisma.dishSlot.findMany({
    where: { restaurantId: owner.restaurantId },
    orderBy: { slotNumber: 'asc' },
  });

  res.json({ slots });
});

/** POST /api/v1/restaurant/slots/:slotNumber/photos */
router.post(
  '/slots/:slotNumber/photos',
  requireClerkAuth,
  upload.array('photos', 4),
  async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
      return;
    }

    const slotNumber = parseInt(req.params.slotNumber, 10);
    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 10) {
      res.status(400).json({ error: 'Slot number must be 1-10', code: 'INVALID_SLOT' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No photos uploaded', code: 'NO_FILES' });
      return;
    }

    const owner = await prisma.restaurantOwner.findUnique({
      where: { clerkUserId: userId },
      include: { restaurant: { include: { subscription: true } } },
    });

    if (!owner) {
      res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
      return;
    }

    if (owner.restaurant.subscription?.status !== 'active') {
      res.status(403).json({ error: 'Active subscription required', code: 'NO_SUBSCRIPTION' });
      return;
    }

    const slot = await prisma.dishSlot.findUnique({
      where: { restaurantId_slotNumber: { restaurantId: owner.restaurantId, slotNumber } },
    });

    if (!slot) {
      res.status(404).json({ error: 'Slot not found', code: 'SLOT_NOT_FOUND' });
      return;
    }

    // Upload photos to R2/local storage
    const photoKeys: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.originalname.split('.').pop() || 'jpg';
      const filename = `photo-${i + 1}.${ext}`;
      const { key } = await saveFile(
        `photos/${owner.restaurantId}/slot-${slotNumber}`,
        filename,
        file.buffer,
      );
      photoKeys.push(key);
    }

    const updated = await prisma.dishSlot.update({
      where: { id: slot.id },
      data: { photoKeys, status: 'photos_uploaded' },
    });

    res.json({
      slotNumber: updated.slotNumber,
      photoKeys: updated.photoKeys,
      status: updated.status,
    });
  },
);

export default router;
