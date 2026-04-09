import { Router, Request, Response } from 'express';
import { getMenuBySlug, incrementScanCount } from '../services/menu.service';

const router = Router();

// In-memory rate limit: 1 scan event per IP per restaurant per hour
const scanRateLimit = new Map<string, number>();

// GET /api/v1/menu/:restaurantSlug
router.get('/:restaurantSlug', async (req: Request, res: Response) => {
  const { restaurantSlug } = req.params;

  try {
    const result = await getMenuBySlug(restaurantSlug);
    if (!result) {
      res.status(404).json({ error: 'Restaurant or menu not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    console.error('GET /menu/:restaurantSlug error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

// POST /api/v1/menu/:restaurantSlug/scan — increment QR scan count (rate limited)
router.post('/:restaurantSlug/scan', async (req: Request, res: Response) => {
  const { restaurantSlug } = req.params;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? 'unknown';
  const key = `${ip}:${restaurantSlug}`;
  const now = Date.now();
  const lastScan = scanRateLimit.get(key) ?? 0;

  if (now - lastScan < 60 * 60 * 1000) {
    // Rate limited — ack but don't count
    res.json({ counted: false });
    return;
  }

  scanRateLimit.set(key, now);

  // Prune old entries every 10k entries to prevent memory leak
  if (scanRateLimit.size > 10_000) {
    const cutoff = now - 60 * 60 * 1000;
    for (const [k, t] of scanRateLimit.entries()) {
      if (t < cutoff) scanRateLimit.delete(k);
    }
  }

  try {
    await incrementScanCount(restaurantSlug);
    res.json({ counted: true });
  } catch (err) {
    console.error('POST /menu/:restaurantSlug/scan error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
