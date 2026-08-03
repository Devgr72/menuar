import { Router, Response } from 'express';
import multer from 'multer';
import { Restaurant, RestaurantOwner, Menu, Category, Dish, MenuScan } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { saveFile } from '../services/storage.service.js';
import { genId } from '../db/id.js';
import { extractMenuFromPhotos, GeminiExtractionError } from '../services/gemini.service.js';
import { MAX_MENU_SCAN_PHOTOS, type MenuScanDraft } from '@menuar/types';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

/** Looks up the caller's restaurant, or writes a 404 response and returns null. */
async function requireOwnerRestaurant(userId: string, res: Response) {
  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  const restaurant = await Restaurant.findById(owner.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return null;
  }
  return { owner, restaurant };
}

/** POST /api/v1/menu-scan — upload up to 20 menu photos, extract dishes with Gemini */
router.post('/', requireAuth, upload.array('photos', 20), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (files.length === 0) {
      res.status(400).json({ error: 'No photos uploaded', code: 'NO_FILES' });
      return;
    }

    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;
    const { restaurant } = ctx;

    const photosUsed = restaurant.photosUsed ?? 0;
    const photosRemaining = MAX_MENU_SCAN_PHOTOS - photosUsed;
    if (files.length > photosRemaining) {
      res.status(400).json({
        error:
          photosRemaining > 0
            ? `You have ${photosRemaining} of ${MAX_MENU_SCAN_PHOTOS} photo upload${photosRemaining === 1 ? '' : 's'} left — this scan needs ${files.length}.`
            : `You've used all ${MAX_MENU_SCAN_PHOTOS} of your photo uploads. Contact support to request more.`,
        code: 'PHOTO_QUOTA_EXCEEDED',
      });
      return;
    }

    // Charged up front, before the Gemini call — a failed extraction still spends the
    // photos actually uploaded, so owners have a real incentive to upload clear photos.
    await Restaurant.updateOne({ _id: restaurant._id }, { $inc: { photosUsed: files.length } });

    let draft: MenuScanDraft;
    try {
      draft = await extractMenuFromPhotos(files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype })));
    } catch (err) {
      if (err instanceof GeminiExtractionError) {
        res.status(422).json({ error: err.message, code: 'EXTRACTION_FAILED' });
        return;
      }
      throw err;
    }

    const scanId = genId();
    const photoKeys = await Promise.all(
      files.map(async (file, i) => {
        const ext = file.mimetype.split('/')[1] || 'jpg';
        const { key } = await saveFile(`menu-scans/${restaurant._id}/${scanId}`, `page-${i + 1}.${ext}`, file.buffer);
        return key;
      }),
    );

    const scan = await MenuScan.create({
      _id: scanId,
      restaurantId: restaurant._id,
      status: 'ready',
      photoKeys,
      draft,
      geminiModel: 'gemini-flash-latest',
    });

    res.json({
      scanId: scan._id,
      draft: scan.draft,
      photosUsed: photosUsed + files.length,
      photosRemaining: photosRemaining - files.length,
    });
  } catch (err) {
    console.error('[MenuScan Error]', err);
    res.status(500).json({ error: 'Failed to process menu scan', code: 'SCAN_ERROR', details: String(err) });
  }
});

/** GET /api/v1/menu-scan/:id — reload a scan's draft (e.g. after a page refresh mid-review) */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;

    const scan = await MenuScan.findOne({ _id: req.params.id, restaurantId: ctx.restaurant._id }).lean();
    if (!scan) {
      res.status(404).json({ error: 'Scan not found', code: 'SCAN_NOT_FOUND' });
      return;
    }

    res.json({ scanId: scan._id, status: scan.status, draft: scan.draft });
  } catch (err) {
    console.error('[MenuScan Error]', err);
    res.status(500).json({ error: 'Failed to fetch menu scan', code: 'SCAN_FETCH_ERROR', details: String(err) });
  }
});

/** POST /api/v1/menu-scan/:id/publish — commit the (possibly owner-edited) draft to the live menu */
router.post('/:id/publish', requireAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const ctx = await requireOwnerRestaurant(userId, res);
    if (!ctx) return;
    const { restaurant } = ctx;

    const scan = await MenuScan.findOne({ _id: req.params.id, restaurantId: restaurant._id });
    if (!scan) {
      res.status(404).json({ error: 'Scan not found', code: 'SCAN_NOT_FOUND' });
      return;
    }
    if (scan.status === 'published') {
      res.status(409).json({ error: 'Scan already published', code: 'ALREADY_PUBLISHED' });
      return;
    }

    const draft = req.body as MenuScanDraft;
    if (!draft || !Array.isArray(draft.categories) || draft.categories.length === 0) {
      res.status(400).json({ error: 'No categories to publish', code: 'EMPTY_DRAFT' });
      return;
    }

    let menu = await Menu.findOne({ restaurantId: restaurant._id, isActive: true });
    if (!menu) {
      menu = await Menu.create({ restaurantId: restaurant._id, name: 'Menu', isActive: true });
    }

    const existingCategories = await Category.find({ menuId: menu._id }).lean();
    const categoryByName = new Map<string, (typeof existingCategories)[number]>(
      existingCategories.map((c) => [c.name.toLowerCase(), c]),
    );
    let nextSortOrder =
      existingCategories.length > 0 ? Math.max(...existingCategories.map((c) => c.sortOrder)) + 1 : 0;

    let categoriesCreated = 0;
    let dishesCreated = 0;

    for (const draftCategory of draft.categories) {
      const name = draftCategory.name?.trim();
      if (!name || draftCategory.dishes.length === 0) continue;

      let category = categoryByName.get(name.toLowerCase());
      if (!category) {
        category = await Category.create({ menuId: menu._id, name, sortOrder: nextSortOrder });
        nextSortOrder += 1;
        categoryByName.set(name.toLowerCase(), category);
        categoriesCreated += 1;
      }

      for (const draftDish of draftCategory.dishes) {
        const dishName = draftDish.name?.trim();
        if (!dishName || typeof draftDish.price !== 'number') continue;

        await Dish.create({
          categoryId: category._id,
          name: dishName,
          description: draftDish.description ?? '',
          price: draftDish.price,
          ingredients: draftDish.ingredients ?? [],
          isVeg: Boolean(draftDish.isVeg),
        });
        dishesCreated += 1;
      }
    }

    scan.status = 'published';
    scan.publishedAt = new Date();
    await scan.save();

    res.json({ categoriesCreated, dishesCreated });
  } catch (err) {
    console.error('[MenuScan Error]', err);
    res.status(500).json({ error: 'Failed to publish menu scan', code: 'PUBLISH_ERROR', details: String(err) });
  }
});

export default router;
