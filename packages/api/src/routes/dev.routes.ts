/**
 * DEV-ONLY routes — never mounted in production.
 * Allows manually triggering webhook side-effects during local development.
 */
import { Router } from 'express';
import { RestaurantOwner, Restaurant, Subscription, Menu, Category } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import QRCode from 'qrcode';
import { saveFile } from '../services/storage.service.js';

const router = Router();
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

/**
 * POST /api/v1/dev/activate
 * Manually marks the current user's subscription as active and generates QR.
 * ONLY available when NODE_ENV !== 'production'.
 */
router.post('/activate', requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;

  const owner = await RestaurantOwner.findOne({ userId }).lean();
  if (!owner) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  const [restaurant, subscription] = await Promise.all([
    Restaurant.findById(owner.restaurantId).lean(),
    Subscription.findOne({ restaurantId: owner.restaurantId }).lean(),
  ]);

  if (!restaurant) {
    res.status(404).json({ error: 'Not registered', code: 'NOT_REGISTERED' });
    return;
  }

  if (!subscription) {
    res.status(404).json({ error: 'No subscription found. Complete the plan selection first.', code: 'NO_SUB' });
    return;
  }

  // Activate the subscription
  await Subscription.updateOne(
    { _id: subscription._id },
    {
      status: 'active',
      activatedAt: new Date(),
      nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    },
  );

  // Generate QR code if not already done
  if (!restaurant.qrUrl) {
    try {
      const qrBuffer = await QRCode.toBuffer(`${WEB_URL}/ar/${restaurant.slug}`, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      const { url } = await saveFile(`qr/${restaurant._id}`, 'main.png', qrBuffer);
      await Restaurant.updateOne({ _id: restaurant._id }, { qrKey: `qr/${restaurant._id}/main.png`, qrUrl: url });
    } catch (err) {
      console.error('QR generation failed (non-fatal):', err);
    }
  }

  // Create default menu if not exists
  const existingMenu = await Menu.findOne({ restaurantId: restaurant._id }).lean();
  if (!existingMenu) {
    const menu = await Menu.create({ restaurantId: restaurant._id, name: 'Menu', isActive: true });
    await Category.create({ menuId: menu._id, name: 'Dishes', sortOrder: 0 });
  }

  res.json({ activated: true, message: 'Subscription activated (dev mode)' });
});

export default router;
