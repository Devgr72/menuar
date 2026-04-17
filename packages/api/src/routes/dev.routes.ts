/**
 * DEV-ONLY routes — never mounted in production.
 * Allows manually triggering webhook side-effects during local development.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import QRCode from 'qrcode';
import { saveFile } from '../services/storage.service';

const router = Router();
const prisma = new PrismaClient();
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

/**
 * POST /api/v1/dev/activate
 * Manually marks the current user's subscription as active and generates QR.
 * ONLY available when NODE_ENV !== 'production'.
 */
router.post('/activate', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const owner = await prisma.restaurantOwner.findUnique({
    where: { userId },
    include: { restaurant: { include: { subscription: true } } },
  });

  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  if (!owner.restaurant.subscription) {
    res.status(404).json({ error: 'No subscription found. Complete the plan selection first.', code: 'NO_SUB' });
    return;
  }

  // Activate the subscription
  await prisma.subscription.update({
    where: { id: owner.restaurant.subscription.id },
    data: {
      status: 'active',
      activatedAt: new Date(),
      nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    },
  });

  // Generate QR code if not already done
  if (!owner.restaurant.qrUrl) {
    try {
      const qrBuffer = await QRCode.toBuffer(`${WEB_URL}/ar/${owner.restaurant.slug}`, {
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
    } catch (err) {
      console.error('QR generation failed (non-fatal):', err);
    }
  }

  // Create default menu if not exists
  const existingMenu = await prisma.menu.findFirst({ where: { restaurantId: owner.restaurant.id } });
  if (!existingMenu) {
    const menu = await prisma.menu.create({
      data: { restaurantId: owner.restaurant.id, name: 'Menu', isActive: true },
    });
    await prisma.category.create({
      data: { menuId: menu.id, name: 'Dishes', sortOrder: 0 },
    });
  }

  res.json({ activated: true, message: 'Subscription activated (dev mode)' });
});

export default router;
