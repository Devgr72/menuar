import { Router } from 'express';
import { z } from 'zod';
import { Inquiry } from '../db/models/index.js';
import { notifyNewInquiry } from '../services/email.service.js';

const router = Router();

/**
 * Public endpoints — anyone on the marketing site can post here, so each one is
 * schema-validated and IP rate-limited.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

const clientIp = (req: { ip?: string; socket: { remoteAddress?: string } }) =>
  req.ip || req.socket.remoteAddress || 'unknown';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email').max(200),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(30),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(4000),
});

const newsletterSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(200),
});

// This package compiles with `strict: false`, which widens Zod's inferred output
// to all-optional. The schemas above already guarantee these at runtime.
interface ContactInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

/** POST /api/v1/inquiry/contact — landing page "Contact Us" form. */
router.post('/contact', async (req, res) => {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many messages. Please try again later.', code: 'RATE_LIMITED' });
    return;
  }

  const parsed = contactSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input', code: 'INVALID_INPUT' });
    return;
  }

  const data = parsed.data as ContactInput;
  const inquiry = await Inquiry.create({ type: 'contact', ...data, ip });
  console.log(`\x1b[36m[inquiry]\x1b[0m contact from ${data.email} — ${data.subject}`);

  // Best effort: a failed notification must never fail the submission.
  notifyNewInquiry({ type: 'contact', ...data }).catch((err) =>
    console.error('\x1b[33m[inquiry]\x1b[0m notification email failed:', err.message),
  );

  res.status(201).json({ id: inquiry._id });
});

/** POST /api/v1/inquiry/newsletter — footer subscribe box. */
router.post('/newsletter', async (req, res) => {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
    return;
  }

  const parsed = newsletterSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input', code: 'INVALID_INPUT' });
    return;
  }

  const email = parsed.data.email as string;
  const existing = await Inquiry.findOne({ type: 'newsletter', email: email.toLowerCase() }).lean();
  if (existing) {
    // Already subscribed — treat as success so the address is not disclosed.
    res.status(200).json({ alreadySubscribed: true });
    return;
  }

  await Inquiry.create({ type: 'newsletter', email, ip });
  console.log(`\x1b[36m[inquiry]\x1b[0m newsletter subscribe — ${email}`);

  notifyNewInquiry({ type: 'newsletter', email }).catch((err) =>
    console.error('\x1b[33m[inquiry]\x1b[0m notification email failed:', err.message),
  );

  res.status(201).json({ alreadySubscribed: false });
});

export default router;
