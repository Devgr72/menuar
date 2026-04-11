import Razorpay from 'razorpay';
import crypto from 'crypto';

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

export { AMOUNT_PAISE };
