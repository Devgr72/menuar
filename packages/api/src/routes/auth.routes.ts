import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Restaurant, RestaurantOwner, DishSlot, Subscription, Partner } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { syncPendingSubscriptionWithRazorpay } from '../services/razorpay.service.js';

const IS_DEV = process.env.NODE_ENV !== 'production';
function log(step: string, data?: unknown) {
  if (IS_DEV) console.log(`\x1b[34m[auth]\x1b[0m ${step}`, data !== undefined ? data : '');
}
function logError(step: string, err: unknown) {
  console.error(`\x1b[31m[auth]\x1b[0m ✗ ${step}`, err);
}

const router = Router();

const RegisterSchema = z.object({
  restaurantName: z.string().min(2).max(100).trim(),
  ownerName: z.string().min(2).max(100).trim(),
  email: z.string().email().optional(),
  partnerId: z.string().optional(),
});

/** Generate a URL-safe slug from restaurant name, retrying with a suffix on collision. */
async function generateSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  let slug = base;
  let suffix = 2;
  while (await Restaurant.exists({ slug })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

/** POST /api/v1/auth/register — create restaurant + owner + 3 dish slots */
router.post('/register', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' });
    return;
  }

  const { restaurantName, ownerName, email } = parsed.data;

  // Check if owner already registered
  const existing = await RestaurantOwner.findOne({ userId });
  if (existing) {
    res.status(409).json({ error: 'Restaurant already registered for this account', code: 'ALREADY_REGISTERED' });
    return;
  }

  // Only attach a referral if it names a real, active partner — an unrecognized
  // or stale code should register the restaurant normally rather than fail it.
  let partnerId: string | undefined;
  if (parsed.data.partnerId) {
    const partner = await Partner.findOne({ partnerId: parsed.data.partnerId, status: 'Active' }).lean();
    if (partner) partnerId = partner.partnerId;
  }

  const slug = await generateSlug(restaurantName);
  const session = await mongoose.startSession();

  try {
    let restaurantId = '';
    let ownerId = '';

    await session.withTransaction(async () => {
      const [restaurant] = await Restaurant.create([{ name: restaurantName, slug, plan: 'free', partnerId }], { session });

      const [owner] = await RestaurantOwner.create(
        [{ userId, ownerName, email, restaurantId: restaurant._id }],
        { session },
      );

      await DishSlot.insertMany(
        Array.from({ length: 3 }, (_, i) => ({
          restaurantId: restaurant._id,
          slotNumber: i + 1,
          status: 'empty',
        })),
        { session },
      );

      restaurantId = restaurant._id;
      ownerId = owner._id;
    });

    if (partnerId) {
      import('../services/notification.service.js').then(({ createPartnerNotification }) => {
        createPartnerNotification(
          partnerId!,
          'RESTAURANT_ONBOARDED',
          'Restaurant Onboarded',
          `Your restaurant ${restaurantName} has been successfully submitted.`
        );
      });
    }

    res.status(201).json({ restaurantId, slug, ownerId });
  } catch (err) {
    logError('Registration error', err);
    res.status(500).json({ error: 'Registration failed', code: 'INTERNAL_ERROR' });
  } finally {
    await session.endSession();
  }
});

/** GET /api/v1/auth/me — get current user's restaurant info */
router.get('/me', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.json({ owner: null });
    return;
  }

  const [restaurant, subscription] = await Promise.all([
    Restaurant.findById(owner.restaurantId).lean(),
    Subscription.findOne({ restaurantId: owner.restaurantId }).lean(),
  ]);

  if (!restaurant) {
    res.json({ owner: null });
    return;
  }

  // Keep in sync with /subscription/status: fast-forward a pending subscription via
  // Razorpay if the activation webhook hasn't landed yet, so ProtectedRoute's gate
  // (which reads /me) never redirects away from /dashboard right after a real payment.
  const syncedSubscription =
    subscription?.status === 'pending'
      ? await syncPendingSubscriptionWithRazorpay(subscription, restaurant)
      : subscription;

  res.json({
    owner: {
      id: owner._id,
      ownerName: owner.ownerName,
      email: owner.email,
      restaurantId: owner.restaurantId,
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
    subscription: syncedSubscription
      ? {
          id: syncedSubscription._id,
          status: syncedSubscription.status,
          activatedAt: syncedSubscription.activatedAt,
          nextBillingAt: syncedSubscription.nextBillingAt,
        }
      : null,
  });
});

export default router;
