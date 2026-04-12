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
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB each, max 5 (1 menu photo + 4 angle photos)
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

/** PATCH /api/v1/restaurant/profile — update owner name and/or restaurant name */
router.patch('/profile', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const { ownerName, restaurantName } = req.body as { ownerName?: string; restaurantName?: string };
  if (!ownerName?.trim() && !restaurantName?.trim()) {
    res.status(400).json({ error: 'Nothing to update', code: 'NO_DATA' });
    return;
  }

  const owner = await prisma.restaurantOwner.findUnique({ where: { clerkUserId: userId } });
  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  await Promise.all([
    ownerName?.trim()
      ? prisma.restaurantOwner.update({ where: { id: owner.id }, data: { ownerName: ownerName.trim() } })
      : Promise.resolve(),
    restaurantName?.trim()
      ? prisma.restaurant.update({ where: { id: owner.restaurantId }, data: { name: restaurantName.trim() } })
      : Promise.resolve(),
  ]);

  res.json({ ok: true });
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

/** POST /api/v1/restaurant/slots/:slotNumber/photos
 *  Accepts fields:
 *    menuPhoto  (single)    — card/thumbnail image shown on the AR menu
 *    photos     (up to 4)   — multi-angle shots used to generate the 3D model
 *    dishName, description  — text fields in the same multipart request
 */
router.post(
  '/slots/:slotNumber/photos',
  requireClerkAuth,
  upload.fields([
    { name: 'menuPhoto', maxCount: 1 },
    { name: 'photos', maxCount: 4 },
  ]),
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

    const fieldFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
    const menuPhotoFiles = fieldFiles?.menuPhoto ?? [];
    const anglePhotoFiles = fieldFiles?.photos ?? [];

    if (menuPhotoFiles.length === 0 && anglePhotoFiles.length === 0) {
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

    const dir = `photos/${owner.restaurantId}/slot-${slotNumber}`;

    // Save menu/thumbnail photo
    let menuPhotoKey: string | undefined;
    let menuPhotoUrl: string | undefined;
    if (menuPhotoFiles.length > 0) {
      const f = menuPhotoFiles[0];
      const ext = f.originalname.split('.').pop() || 'jpg';
      const { key, url } = await saveFile(dir, `menu.${ext}`, f.buffer);
      menuPhotoKey = key;
      menuPhotoUrl = url;
    }

    // Save 3D-angle photos
    const photoKeys: string[] = [];
    for (let i = 0; i < anglePhotoFiles.length; i++) {
      const f = anglePhotoFiles[i];
      const ext = f.originalname.split('.').pop() || 'jpg';
      const { key } = await saveFile(dir, `angle-${i + 1}.${ext}`, f.buffer);
      photoKeys.push(key);
    }

    const { dishName, description, price, isVeg } = req.body as { dishName?: string; description?: string; price?: string; isVeg?: string };

    const parsedPrice = price && !isNaN(parseFloat(price)) ? parseFloat(price) : undefined;
    const parsedIsVeg = isVeg ? isVeg === 'true' : undefined;

    const updated = await prisma.dishSlot.update({
      where: { id: slot.id },
      data: {
        ...(photoKeys.length > 0 ? { photoKeys } : {}),
        ...(menuPhotoKey ? { menuPhotoKey, menuPhotoUrl } : {}),
        status: 'photos_uploaded',
        ...(dishName?.trim() ? { dishName: dishName.trim() } : {}),
        ...(description?.trim() ? { description: description.trim() } : {}),
        ...(parsedPrice !== undefined ? { price: parsedPrice } : {}),
        ...(parsedIsVeg !== undefined ? { isVeg: parsedIsVeg } : {}),
      },
    });

    res.json({
      slotNumber: updated.slotNumber,
      menuPhotoUrl: updated.menuPhotoUrl,
      photoKeys: updated.photoKeys,
      status: updated.status,
    });
  },
);

export default router;
