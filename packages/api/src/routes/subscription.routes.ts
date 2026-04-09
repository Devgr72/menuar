import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { PrismaClient } from '@prisma/client';
import { requireClerkAuth } from '../middleware/clerkAuth';
import {
  ensureMonthlyPlan,
  createRazorpaySubscription,
  AMOUNT_PAISE,
} from '../services/razorpay.service';

const router = Router();
const prisma = new PrismaClient();

/** POST /api/v1/subscription/create — create Razorpay subscription for current restaurant */
router.post('/create', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const owner = await prisma.restaurantOwner.findUnique({
    where: { clerkUserId: userId },
    include: { restaurant: { include: { subscription: true } } },
  });

  if (!owner) {
    res.status(404).json({ error: 'Restaurant not registered', code: 'NOT_REGISTERED' });
    return;
  }

  // Already has an active subscription
  if (owner.restaurant.subscription?.status === 'active') {
    res.status(409).json({ error: 'Already subscribed', code: 'ALREADY_SUBSCRIBED' });
    return;
  }

  try {
    const planId = await ensureMonthlyPlan();

    const { razorpaySubId, checkoutUrl, amount } = await createRazorpaySubscription(
      planId,
      owner.restaurant.name,
      owner.email ?? undefined,
    );

    // Upsert subscription record (may exist from a previous failed attempt)
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

    res.json({ checkoutUrl });
  } catch (err) {
    console.error('Subscription creation error:', err);
    res.status(500).json({ error: 'Failed to create subscription', code: 'RAZORPAY_ERROR' });
  }
});

/** GET /api/v1/subscription/status — get current subscription status */
router.get('/status', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const owner = await prisma.restaurantOwner.findUnique({
    where: { clerkUserId: userId },
    include: { restaurant: { include: { subscription: true } } },
  });

  if (!owner?.restaurant.subscription) {
    res.json({ subscription: null });
    return;
  }

  const sub = owner.restaurant.subscription;
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

export default router;
