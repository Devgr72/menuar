import { Router } from 'express';
import multer from 'multer';
import { Restaurant, RestaurantOwner, Subscription, DishSlot } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { saveFile } from '../services/storage.service.js';
import { toId, toIds } from '../db/serialize.js';

const router = Router();

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
router.get('/dashboard', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  try {
    const owner = await RestaurantOwner.findOne({ userId }).lean();
    if (!owner) {
      res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
      return;
    }

    const [restaurant, subscription, slots] = await Promise.all([
      Restaurant.findById(owner.restaurantId).lean(),
      Subscription.findOne({ restaurantId: owner.restaurantId }).lean(),
      DishSlot.find({ restaurantId: owner.restaurantId }).sort({ slotNumber: 1 }).lean(),
    ]);

    if (!restaurant) {
      res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
      return;
    }

    res.json({
      owner: {
        id: owner._id,
        ownerName: owner.ownerName,
        email: owner.email,
        restaurantId: owner.restaurantId,
        createdAt: owner.createdAt,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        plan: restaurant.plan,
        qrUrl: restaurant.qrUrl,
        scanCount: restaurant.scanCount,
        photosUsed: restaurant.photosUsed ?? 0,
        createdAt: restaurant.createdAt,
      },
      subscription: subscription
        ? {
            id: subscription._id,
            status: subscription.status,
            amount: subscription.amount,
            activatedAt: subscription.activatedAt,
            nextBillingAt: subscription.nextBillingAt,
            haltedAt: subscription.haltedAt,
          }
        : null,
      slots: toIds(slots),
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ error: 'Failed to load dashboard', code: 'DASHBOARD_ERROR', details: String(err) });
  }
});

/** PATCH /api/v1/restaurant/profile — update owner name and/or restaurant name */
router.patch('/profile', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const { ownerName, restaurantName } = req.body as { ownerName?: string; restaurantName?: string };
  if (!ownerName?.trim() && !restaurantName?.trim()) {
    res.status(400).json({ error: 'Nothing to update', code: 'NO_DATA' });
    return;
  }

  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  await Promise.all([
    ownerName?.trim()
      ? RestaurantOwner.updateOne({ _id: owner._id }, { ownerName: ownerName.trim() })
      : Promise.resolve(),
    restaurantName?.trim()
      ? Restaurant.updateOne({ _id: owner.restaurantId }, { name: restaurantName.trim() })
      : Promise.resolve(),
  ]);

  res.json({ ok: true });
});

/** GET /api/v1/restaurant/slots */
router.get('/slots', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  const slots = await DishSlot.find({ restaurantId: owner.restaurantId }).sort({ slotNumber: 1 }).lean();

  res.json({ slots: toIds(slots) });
});

/** POST /api/v1/restaurant/slots/:slotNumber/photos
 *  Accepts fields:
 *    menuPhoto  (single)    — card/thumbnail image shown on the AR menu
 *    photos     (up to 4)   — multi-angle shots used to generate the 3D model
 *    dishName, description  — text fields in the same multipart request
 */
router.post(
  '/slots/:slotNumber/photos',
  requireAuth,
  upload.fields([
    { name: 'menuPhoto', maxCount: 1 },
    { name: 'photos', maxCount: 4 },
  ]),
  async (req, res) => {
    const userId = res.locals.userId as string;

    const slotNumber = parseInt(req.params.slotNumber, 10);
    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 3) {
      res.status(400).json({ error: 'Slot number must be 1-3', code: 'INVALID_SLOT' });
      return;
    }

    const fieldFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
    const menuPhotoFiles = fieldFiles?.menuPhoto ?? [];
    const anglePhotoFiles = fieldFiles?.photos ?? [];

    if (menuPhotoFiles.length === 0 && anglePhotoFiles.length === 0) {
      res.status(400).json({ error: 'No photos uploaded', code: 'NO_FILES' });
      return;
    }

    const owner = await RestaurantOwner.findOne({ userId }).lean();
    if (!owner) {
      res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
      return;
    }

    const subscription = await Subscription.findOne({ restaurantId: owner.restaurantId }).lean();
    if (subscription?.status !== 'active') {
      res.status(403).json({ error: 'Active subscription required', code: 'NO_SUBSCRIPTION' });
      return;
    }

    const slot = await DishSlot.findOne({ restaurantId: owner.restaurantId, slotNumber });
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

    const { dishName, description, price, isVeg } = req.body as {
      dishName?: string;
      description?: string;
      price?: string;
      isVeg?: string;
    };

    const parsedPrice = price && !isNaN(parseFloat(price)) ? parseFloat(price) : undefined;
    const parsedIsVeg = isVeg ? isVeg === 'true' : undefined;

    const updated = await DishSlot.findByIdAndUpdate(
      slot._id,
      {
        ...(photoKeys.length > 0 ? { photoKeys } : {}),
        ...(menuPhotoKey ? { menuPhotoKey, menuPhotoUrl } : {}),
        status: 'photos_uploaded',
        ...(dishName?.trim() ? { dishName: dishName.trim() } : {}),
        ...(description?.trim() ? { description: description.trim() } : {}),
        ...(parsedPrice !== undefined ? { price: parsedPrice } : {}),
        ...(parsedIsVeg !== undefined ? { isVeg: parsedIsVeg } : {}),
      },
      { new: true },
    ).lean();

    res.json({
      slotNumber: updated!.slotNumber,
      menuPhotoUrl: updated!.menuPhotoUrl,
      photoKeys: updated!.photoKeys,
      status: updated!.status,
    });
  },
);

export default router;
