import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireClerkAuth } from '../middleware/clerkAuth';

const IS_DEV = process.env.NODE_ENV !== 'production';
function log(step: string, data?: unknown) {
  if (IS_DEV) console.log(`\x1b[34m[auth]\x1b[0m ${step}`, data !== undefined ? data : '');
}
function logError(step: string, err: unknown) {
  console.error(`\x1b[31m[auth]\x1b[0m ✗ ${step}`, err);
}

const router = Router();
const prisma = new PrismaClient();

const RegisterSchema = z.object({
  restaurantName: z.string().min(2).max(100).trim(),
  ownerName: z.string().min(2).max(100).trim(),
  email: z.string().email().optional(),
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
  while (await prisma.restaurant.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

/** POST /api/v1/auth/register — create restaurant + owner + 10 dish slots */
router.post('/register', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
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
  const existing = await prisma.restaurantOwner.findUnique({ where: { clerkUserId: userId } });
  if (existing) {
    res.status(409).json({ error: 'Restaurant already registered for this account', code: 'ALREADY_REGISTERED' });
    return;
  }

  try {
    const slug = await generateSlug(restaurantName);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: restaurantName, slug, plan: 'free' },
      });

      const owner = await tx.restaurantOwner.create({
        data: { clerkUserId: userId, ownerName, email, restaurantId: restaurant.id },
      });

      // Create 10 dish slots
      await tx.dishSlot.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          restaurantId: restaurant.id,
          slotNumber: i + 1,
          status: 'empty',
        })),
      });

      return { restaurant, owner };
    });

    res.status(201).json({
      restaurantId: result.restaurant.id,
      slug: result.restaurant.slug,
      ownerId: result.owner.id,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed', code: 'INTERNAL_ERROR' });
  }
});

/** GET /api/v1/auth/me — get current user's restaurant info */
router.get('/me', requireClerkAuth, async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const owner = await prisma.restaurantOwner.findUnique({
    where: { clerkUserId: userId },
    include: {
      restaurant: {
        include: { subscription: true },
      },
    },
  });

  if (!owner) {
    res.json({ owner: null });
    return;
  }

  res.json({
    owner: {
      id: owner.id,
      ownerName: owner.ownerName,
      email: owner.email,
      restaurantId: owner.restaurantId,
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
          activatedAt: owner.restaurant.subscription.activatedAt,
          nextBillingAt: owner.restaurant.subscription.nextBillingAt,
        }
      : null,
  });
});

export default router;
