import Razorpay from 'razorpay';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Restaurant, Subscription, Menu, Category } from '../db/models/index.js';
import { saveFile } from './storage.service.js';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const AMOUNT_PAISE = 50000; // ₹500 in paise
const MONTHLY_TOTAL_COUNT = 120; // 10 years max — effectively unlimited

let razorpayClient: Razorpay | null = null;
let cachedPlanId: string | null = process.env.RAZORPAY_PLAN_ID || null;

export function getClient(): Razorpay {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
    }
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
}

/** Ensures a ₹500/month plan exists in Razorpay. Returns planId (cached). */
export async function ensureMonthlyPlan(): Promise<string> {
  if (cachedPlanId) return cachedPlanId;

  const client = getClient();
  // @ts-ignore — Razorpay types incomplete
  const plan = await client.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'DishDekho Starter Plan',
      amount: AMOUNT_PAISE,
      currency: 'INR',
      description: 'DishDekho — 10 AR dishes, QR code, dashboard',
    },
  });

  cachedPlanId = plan.id;
  return plan.id;
}

export interface SubscriptionResult {
  razorpaySubId: string;
  checkoutUrl: string;
  amount: number;
}

/** Creates a Razorpay subscription and returns the hosted checkout URL. */
export async function createRazorpaySubscription(
  planId: string,
  restaurantName: string,
  ownerEmail: string | undefined,
): Promise<SubscriptionResult> {
  const client = getClient();

  const notify: Record<string, unknown> = { sms: true, whatsapp: false };
  if (ownerEmail) {
    // @ts-ignore
    notify.email = true;
  }

  // @ts-ignore — Razorpay types incomplete
  const sub = await client.subscriptions.create({
    plan_id: planId,
    total_count: MONTHLY_TOTAL_COUNT,
    quantity: 1,
    notify_info: notify,
    notes: { restaurantName },
  });

  return {
    razorpaySubId: sub.id,
    checkoutUrl: sub.short_url,
    amount: AMOUNT_PAISE,
  };
}

/** Verifies Razorpay webhook signature. Returns true if valid. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

interface PendingSubscriptionDoc {
  _id: unknown;
  status: string;
  razorpaySubId: string;
}

interface RestaurantDoc {
  _id: unknown;
  slug: string;
  qrUrl?: string;
  partnerId?: string;
  name?: string;
}

/**
 * Fast-forwards a `pending` subscription to `active` by checking Razorpay directly,
 * for cases where the activation webhook hasn't landed yet (unreachable localhost in dev,
 * or webhook delivery lag in prod). Returns the up-to-date subscription doc either way.
 *
 * Shared by GET /subscription/status and GET /auth/me so both endpoints — and therefore
 * both the payment-callback poll and the ProtectedRoute auth gate — agree on subscription
 * state instead of racing each other.
 */
export async function syncPendingSubscriptionWithRazorpay<T extends PendingSubscriptionDoc>(
  sub: T,
  restaurant: RestaurantDoc,
): Promise<T> {
  if (sub.status !== 'pending') return sub;

  try {
    const client = getClient();
    const rzpSub = await client.subscriptions.fetch(sub.razorpaySubId);

    if (rzpSub.status !== 'active' && rzpSub.status !== 'authenticated') {
      return sub;
    }

    // @ts-ignore — Razorpay types incomplete
    const chargeAt = rzpSub.charge_at as number | undefined;

    const updatedSub = await Subscription.findByIdAndUpdate(
      sub._id,
      {
        status: 'active',
        activatedAt: new Date(),
        nextBillingAt: chargeAt ? new Date(chargeAt * 1000) : undefined,
        haltedAt: null,
      },
      { new: true },
    ).lean();

    // Generate QR code if missing
    if (!restaurant.qrUrl) {
      const qrBuffer = await QRCode.toBuffer(`${WEB_URL}/ar/${restaurant.slug}`, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      const { url } = await saveFile(`qr/${restaurant._id}`, 'main.png', qrBuffer);
      await Restaurant.updateOne({ _id: restaurant._id }, { qrKey: `qr/${restaurant._id}/main.png`, qrUrl: url });
    }

    // Create default menu if lacking
    const existingMenu = await Menu.findOne({ restaurantId: restaurant._id }).lean();
    if (!existingMenu) {
      const menu = await Menu.create({ restaurantId: restaurant._id, name: 'Menu', isActive: true });
      await Category.create({ menuId: menu._id, name: 'Dishes', sortOrder: 0 });
    }

    // Partner Commission (Fallback for local dev without webhooks)
    if (restaurant.partnerId) {
      const { PartnerCommission } = await import('../db/models/index.js');
      const existing = await PartnerCommission.findOne({ subscriptionId: sub._id, type: 'FIRST_SUBSCRIPTION' }).lean();
      if (!existing) {
        await PartnerCommission.create({
          partnerId: restaurant.partnerId,
          restaurantId: restaurant._id,
          subscriptionId: sub._id,
          type: 'FIRST_SUBSCRIPTION',
          amount: 150,
          status: 'PENDING',
        });
        import('./notification.service.js').then(({ createPartnerNotification, emitAdminEvent }) => {
          createPartnerNotification(
            restaurant.partnerId!,
            'COMMISSION_EARNED',
            'Commission Earned 💰',
            `You earned ₹150 from ${restaurant.name || 'a new restaurant'}.`
          );
          emitAdminEvent('admin:commission_earned', { partnerId: restaurant.partnerId, amount: 150 });
        });
      }
    }

    return updatedSub! as T;
  } catch {
    return sub;
  }
}

export { AMOUNT_PAISE };
