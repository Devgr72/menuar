import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import {
  ensureMonthlyPlan,
  createRazorpaySubscription,
  getClient,
  AMOUNT_PAISE,
} from '../services/razorpay.service';
import QRCode from 'qrcode';
import { saveFile } from '../services/storage.service';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const router = Router();
const prisma = new PrismaClient();
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
  const owner = await prisma.restaurantOwner.findUnique({
    where: { userId: userId },
    include: { restaurant: { include: { subscription: true } } },
  }).catch((err) => {
    logError('Prisma lookup failed', err);
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

  log('Step 1 ✓ Owner found', {
    ownerId: owner.id,
    restaurantId: owner.restaurantId,
    restaurantName: owner.restaurant.name,
    existingSubscription: owner.restaurant.subscription
      ? { status: owner.restaurant.subscription.status, id: owner.restaurant.subscription.id }
      : null,
  });

  // Step 2: Check for existing active subscription
  if (owner.restaurant.subscription?.status === 'active') {
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
      restaurantName: owner.restaurant.name,
      email: owner.email,
    });

    const { razorpaySubId, checkoutUrl, amount } = await createRazorpaySubscription(
      planId,
      owner.restaurant.name,
      owner.email ?? undefined,
    );
    log('Step 3 ✓ Razorpay subscription created', { razorpaySubId, checkoutUrl, amount });

    // Step 5: Upsert subscription record in DB
    log('Step 4: Upserting subscription in DB');
    await prisma.subscription.upsert({
      where: { restaurantId: owner.restaurantId },
      update: { razorpaySubId, razorpayPlanId: planId, status: 'pending', amount },
      create: {
        restaurantId: owner.restaurantId,
        razorpaySubId,
        razorpayPlanId: planId,
        status: 'pending',
        amount,
      },
    });
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

  const owner = await prisma.restaurantOwner.findUnique({
    where: { userId: userId },
    include: { restaurant: { include: { subscription: true } } },
  });

  if (!owner) {
    log('Status: owner not found — not registered', { userId });
    res.status(404).json({ error: 'Restaurant not found. Please complete onboarding first.', code: 'NOT_REGISTERED' });
    return;
  }

  if (!owner.restaurant.subscription) {
    log('Status: owner exists but no subscription yet', { userId });
    res.json({ subscription: null });
    return;
  }

  let sub = owner.restaurant.subscription;

  // Fallback sync for local development where Razorpay webhooks cannot reach localhost
  if (sub.status === 'pending') {
    try {
      const client = getClient();
      const rzpSub = await client.subscriptions.fetch(sub.razorpaySubId);
      
      if (rzpSub.status === 'active' || rzpSub.status === 'authenticated') {
        log('Razorpay says active/authenticated — fast-forwarding subscription state (webhook fallback)');
        // @ts-ignore
        const chargeAt = rzpSub.charge_at as number | undefined;
        
        await prisma.$transaction(async (tx) => {
          sub = await tx.subscription.update({
            where: { id: sub.id },
            data: {
              status: 'active',
              activatedAt: new Date(),
              nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
              haltedAt: null,
            },
          });
        });

        // Generate QR code if missing
        if (!owner.restaurant.qrUrl) {
          const qrBuffer = await QRCode.toBuffer(`${BASE_URL}/ar/${owner.restaurant.slug}`, {
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          const { url } = await saveFile(`qr/${owner.restaurant.id}`, 'main.png', qrBuffer);
          await prisma.restaurant.update({
            where: { id: owner.restaurant.id },
            data: { qrKey: `qr/${owner.restaurant.id}/main.png`, qrUrl: url },
          });
        }

        // Create default menu if lacking
        const existingMenu = await prisma.menu.findFirst({ where: { restaurantId: owner.restaurant.id } });
        if (!existingMenu) {
          const menu = await prisma.menu.create({
            data: { restaurantId: owner.restaurant.id, name: 'Menu', isActive: true },
          });
          await prisma.category.create({
            data: { menuId: menu.id, name: 'Dishes', sortOrder: 0 },
          });
        }
      }
    } catch (err) {
      logError('Failed to sync pending subscription with Razorpay:', err);
    }
  }

  log('Status: returning subscription', { status: sub.status, id: sub.id });
  res.json({
    subscription: {
      id: sub.id,
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
