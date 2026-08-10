import { Router } from 'express';
import mongoose from 'mongoose';
import { Subscription, Restaurant, Menu, Category, PaymentEvent, PartnerCommission } from '../db/models/index.js';
import { verifyWebhookSignature } from '../services/razorpay.service.js';
import QRCode from 'qrcode';
import { saveFile } from '../services/storage.service.js';

const router = Router();

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

/** Runs a subscription-status update + payment-event log atomically. */
async function recordEvent(
  subscriptionId: string,
  update: Record<string, unknown>,
  eventType: string,
  razorpayEventId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Subscription.updateOne({ _id: subscriptionId }, update, { session });
      await PaymentEvent.create([{ subscriptionId, eventType, razorpayEventId, payload }], { session });
    });
  } finally {
    await session.endSession();
  }
}

/** POST /api/v1/webhook/razorpay — Razorpay sends all subscription events here */
// Note: raw body needed for signature verification — mounted with express.raw() in index.ts
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = req.body as Buffer;

  if (!verifyWebhookSignature(rawBody.toString(), signature)) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const eventType = event.event;
  // @ts-ignore — dynamic Razorpay payload
  const subPayload = event.payload?.subscription?.entity;
  const razorpaySubId = subPayload?.id as string | undefined;

  if (!razorpaySubId) {
    // Not a subscription event we care about — ack it
    res.json({ received: true });
    return;
  }

  const subscription = await Subscription.findOne({ razorpaySubId }).lean();

  if (!subscription) {
    // Unknown subscription — ack to prevent Razorpay retries
    res.json({ received: true });
    return;
  }

  const restaurant = await Restaurant.findById(subscription.restaurantId).lean();

  try {
    switch (eventType) {
      case 'subscription.activated': {
        const chargeAt = subPayload?.charge_at as number | undefined;
        await recordEvent(
          subscription._id,
          {
            status: 'active',
            activatedAt: new Date(),
            nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
            haltedAt: null,
          },
          'subscription_activated',
          `${eventType}-${razorpaySubId}`,
          event.payload,
        );

        if (restaurant) {
          // Generate + store QR code (fire-and-forget ok, non-critical path)
          generateAndStoreQR(subscription.restaurantId, restaurant.slug).catch((err) =>
            console.error('QR generation failed:', err),
          );

          // Create default menu skeleton if not exists
          createDefaultMenu(subscription.restaurantId).catch((err) =>
            console.error('Default menu creation failed:', err),
          );

          // Partner Notification
          if (restaurant.partnerId) {
            await PartnerCommission.create({
              partnerId: restaurant.partnerId,
              restaurantId: restaurant._id,
              subscriptionId: subscription._id,
              type: 'FIRST_SUBSCRIPTION',
              amount: 150,
              status: 'PENDING',
            });

            import('../services/notification.service.js').then(({ createPartnerNotification, emitAdminEvent }) => {
              createPartnerNotification(
                restaurant.partnerId!,
                'COMMISSION_EARNED',
                'Commission Earned 💰',
                `You earned ₹150 from ${restaurant.name}.`
              );
              emitAdminEvent('admin:commission_earned', { partnerId: restaurant.partnerId, amount: 150 });
            });
          }
        }
        break;
      }

      case 'subscription.charged': {
        const chargeAt = subPayload?.charge_at as number | undefined;
        await recordEvent(
          subscription._id,
          {
            status: 'active',
            nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
          },
          'subscription_charged',
          `${eventType}-${razorpaySubId}-${Date.now()}`,
          event.payload,
        );

        if (restaurant?.partnerId) {
          await PartnerCommission.create({
            partnerId: restaurant.partnerId,
            restaurantId: restaurant._id,
            subscriptionId: subscription._id,
            type: 'RENEWAL',
            amount: 100,
            status: 'PENDING',
          });

          import('../services/notification.service.js').then(({ createPartnerNotification, emitAdminEvent }) => {
            createPartnerNotification(
              restaurant.partnerId!,
              'RENEWAL_COMMISSION',
              'Recurring Commission Earned 💰',
              `You earned ₹100 from ${restaurant.name}.`
            );
            emitAdminEvent('admin:commission_earned', { partnerId: restaurant.partnerId, amount: 100 });
          });
        }
        break;
      }

      case 'subscription.halted': {
        await recordEvent(
          subscription._id,
          { status: 'halted', haltedAt: new Date() },
          'subscription_halted',
          `${eventType}-${razorpaySubId}`,
          event.payload,
        );
        break;
      }

      case 'subscription.cancelled': {
        await recordEvent(
          subscription._id,
          { status: 'cancelled', cancelledAt: new Date() },
          'subscription_cancelled',
          `${eventType}-${razorpaySubId}`,
          event.payload,
        );
        break;
      }

      case 'payment.failed': {
        // Record the event; subscription may still retry — don't change status
        await PaymentEvent.create({
          subscriptionId: subscription._id,
          eventType: 'payment_failed',
          razorpayEventId: `${eventType}-${razorpaySubId}-${Date.now()}`,
          payload: event.payload,
        });

        if (restaurant?.partnerId) {
          import('../services/notification.service.js').then(({ createPartnerNotification }) => {
            createPartnerNotification(
              restaurant.partnerId!,
              'RESTAURANT_PAYMENT_DUE',
              'Subscription Payment Due',
              `${restaurant.name}'s subscription requires attention.`
            );
          });
        }
        break;
      }

      default:
        // Unknown event — ack silently
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error [${eventType}]:`, err);
    // Still return 200 — we don't want Razorpay to retry events we've partially handled
  }

  // Always 200 so Razorpay stops retrying
  res.json({ received: true });
});

async function generateAndStoreQR(restaurantId: string, slug: string): Promise<void> {
  const qrUrl = `${WEB_URL}/ar/${slug}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const { url } = await saveFile(`qr/${restaurantId}`, 'main.png', qrBuffer);

  await Restaurant.updateOne({ _id: restaurantId }, { qrKey: `qr/${restaurantId}/main.png`, qrUrl: url });
}

async function createDefaultMenu(restaurantId: string): Promise<void> {
  const existing = await Menu.findOne({ restaurantId }).lean();
  if (existing) return;

  const menu = await Menu.create({ restaurantId, name: 'Menu', isActive: true });
  await Category.create({ menuId: menu._id, name: 'Dishes', sortOrder: 0 });
}

export default router;
