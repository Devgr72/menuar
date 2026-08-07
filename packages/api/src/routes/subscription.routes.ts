import { Router } from 'express';
import { Restaurant, RestaurantOwner, Subscription } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  ensureMonthlyPlan,
  createRazorpaySubscription,
  syncPendingSubscriptionWithRazorpay,
  AMOUNT_PAISE,
} from '../services/razorpay.service.js';

const router = Router();
const IS_DEV = process.env.NODE_ENV !== 'production';

function log(step: string, data?: unknown) {
  if (IS_DEV) console.log(`\x1b[34m[subscription]\x1b[0m ${step}`, data !== undefined ? data : '');
}
function logError(step: string, err: unknown) {
  console.error(`\x1b[31m[subscription]\x1b[0m ✗ ${step}`, err);
}

/** POST /api/v1/subscription/create — create Razorpay subscription for current restaurant */
router.post('/create', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  log('Create subscription request', { userId });

  // Step 1: Look up restaurant owner
  log('Step 1: Looking up restaurantOwner for userId', userId);
  const owner = await RestaurantOwner.findOne({ userId }).lean().catch((err) => {
    logError('Owner lookup failed', err);
    return null;
  });

  if (!owner) {
    log('Owner not found — user has not completed onboarding', { userId });
    res.status(404).json({
      error: 'Restaurant not found. Please complete onboarding first.',
      code: 'NOT_REGISTERED',
    });
    return;
  }

  const [restaurant, existingSubscription] = await Promise.all([
    Restaurant.findById(owner.restaurantId).lean(),
    Subscription.findOne({ restaurantId: owner.restaurantId }).lean(),
  ]);

  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return;
  }

  log('Step 1 ✓ Owner found', {
    ownerId: owner._id,
    restaurantId: owner.restaurantId,
    restaurantName: restaurant.name,
    existingSubscription: existingSubscription ? { status: existingSubscription.status, id: existingSubscription._id } : null,
  });

  // Step 2: Check for existing active subscription
  if (existingSubscription?.status === 'active') {
    log('Already subscribed — returning 409');
    res.status(409).json({ error: 'Already subscribed', code: 'ALREADY_SUBSCRIBED' });
    return;
  }

  // Step 3: Ensure Razorpay plan exists
  try {
    log('Step 2: Ensuring Razorpay monthly plan exists');
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    log('Razorpay env check', {
      keyId: razorpayKeyId ? razorpayKeyId.slice(0, 12) + '…' : 'MISSING ⚠️',
      keySecret: razorpayKeySecret ? '✓ set' : 'MISSING ⚠️',
      planIdCached: process.env.RAZORPAY_PLAN_ID || 'none (will create)',
    });

    if (!razorpayKeyId || !razorpayKeySecret) {
      logError('Razorpay keys missing from environment', { razorpayKeyId, razorpayKeySecret: !!razorpayKeySecret });
      res.status(500).json({ error: 'Payment service not configured', code: 'RAZORPAY_NOT_CONFIGURED' });
      return;
    }

    const planId = await ensureMonthlyPlan();
    log('Step 2 ✓ Plan ID', planId);

    // Step 4: Create Razorpay subscription
    log('Step 3: Creating Razorpay subscription', {
      planId,
      restaurantName: restaurant.name,
      email: owner.email,
    });

    const { razorpaySubId, checkoutUrl, amount } = await createRazorpaySubscription(
      planId,
      restaurant.name,
      owner.email ?? undefined,
    );
    log('Step 3 ✓ Razorpay subscription created', { razorpaySubId, checkoutUrl, amount });

    // Step 5: Upsert subscription record in DB
    log('Step 4: Upserting subscription in DB');
    await Subscription.findOneAndUpdate(
      { restaurantId: owner.restaurantId },
      { razorpaySubId, razorpayPlanId: planId, status: 'pending', amount },
      { upsert: true, setDefaultsOnInsert: true },
    );
    log('Step 4 ✓ DB subscription upserted');

    const responsePayload = {
      checkoutUrl,
      razorpaySubId,
      razorpayKeyId,
    };
    log('Responding with', { ...responsePayload, razorpayKeyId: razorpayKeyId.slice(0, 12) + '…' });
    res.json(responsePayload);
  } catch (err) {
    logError('Subscription creation failed', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: `Failed to create subscription: ${IS_DEV ? errMsg : 'internal error'}`,
      code: 'RAZORPAY_ERROR',
    });
  }
});

/** GET /api/v1/subscription/status — get current subscription status */
router.get('/status', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return;
  }

  const restaurant = await Restaurant.findById(owner.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return;
  }

  let sub = await Subscription.findOne({ restaurantId: owner.restaurantId }).lean();
  if (!sub) {
    log('Status: owner exists but no subscription yet', { userId });
    res.json({ subscription: null });
    return;
  }

  // Fallback sync for local development where Razorpay webhooks cannot reach localhost
  if (sub.status === 'pending') {
    sub = await syncPendingSubscriptionWithRazorpay(sub, restaurant);
  }

  log('Status: returning subscription', { status: sub.status, id: sub._id });
  res.json({
    subscription: {
      id: sub._id,
      status: sub.status,
      activatedAt: sub.activatedAt,
      nextBillingAt: sub.nextBillingAt,
      haltedAt: sub.haltedAt,
      amount: sub.amount,
    },
  });
});

export { AMOUNT_PAISE };
export default router;
