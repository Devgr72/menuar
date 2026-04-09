import { Router, raw } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyWebhookSignature } from '../services/razorpay.service';
import QRCode from 'qrcode';
import { saveFile } from '../services/storage.service';

const router = Router();
const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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

  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubId },
    include: { restaurant: true },
  });

  if (!subscription) {
    // Unknown subscription — ack to prevent Razorpay retries
    res.json({ received: true });
    return;
  }

  // Idempotency: use razorpayEventId to avoid duplicate processing
  const razorpayEventId = `${eventType}:${razorpaySubId}:${Date.now()}`;

  try {
    switch (eventType) {
      case 'subscription.activated': {
        const chargeAt = subPayload?.charge_at as number | undefined;
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              activatedAt: new Date(),
              nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
              haltedAt: null,
            },
          });
          await tx.paymentEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: 'subscription_activated',
              razorpayEventId: `${eventType}-${razorpaySubId}`,
              payload: event.payload as object,
            },
          });
        });

        // Generate + store QR code (fire-and-forget ok, non-critical path)
        generateAndStoreQR(subscription.restaurantId, subscription.restaurant.slug).catch(
          (err) => console.error('QR generation failed:', err),
        );

        // Create default menu skeleton if not exists
        createDefaultMenu(subscription.restaurantId).catch(
          (err) => console.error('Default menu creation failed:', err),
        );
        break;
      }

      case 'subscription.charged': {
        const chargeAt = subPayload?.charge_at as number | undefined;
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
            },
          });
          await tx.paymentEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: 'subscription_charged',
              razorpayEventId: `${eventType}-${razorpaySubId}-${Date.now()}`,
              payload: event.payload as object,
            },
          });
        });
        break;
      }

      case 'subscription.halted': {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: 'halted', haltedAt: new Date() },
          });
          await tx.paymentEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: 'subscription_halted',
              razorpayEventId: `${eventType}-${razorpaySubId}`,
              payload: event.payload as object,
            },
          });
        });
        break;
      }

      case 'subscription.cancelled': {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: 'cancelled', cancelledAt: new Date() },
          });
          await tx.paymentEvent.create({
            data: {
              subscriptionId: subscription.id,
              eventType: 'subscription_cancelled',
              razorpayEventId: `${eventType}-${razorpaySubId}`,
              payload: event.payload as object,
            },
          });
        });
        break;
      }

      case 'payment.failed': {
        // Record the event; subscription may still retry — don't change status
        await prisma.paymentEvent.create({
          data: {
            subscriptionId: subscription.id,
            eventType: 'payment_failed',
            razorpayEventId: `${eventType}-${razorpaySubId}-${Date.now()}`,
            payload: event.payload as object,
          },
        });
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
  return razorpayEventId; // unused, suppresses TS unused var warning
});

async function generateAndStoreQR(restaurantId: string, slug: string): Promise<void> {
  const qrUrl = `${BASE_URL}/ar/${slug}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    errorCorrectionLevel: 'H',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const { url } = await saveFile(`qr/${restaurantId}`, 'main.png', qrBuffer);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { qrKey: `qr/${restaurantId}/main.png`, qrUrl: url },
  });
}

async function createDefaultMenu(restaurantId: string): Promise<void> {
  const existing = await prisma.menu.findFirst({ where: { restaurantId } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const menu = await tx.menu.create({
      data: { restaurantId, name: 'Menu', isActive: true },
    });
    await tx.category.create({
      data: { menuId: menu.id, name: 'Dishes', sortOrder: 0 },
    });
  });
}

export default router;
