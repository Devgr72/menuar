import { Router, Request, Response } from 'express';
import { getMenuBySlug } from '../services/menu.service';

const router = Router();

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

export default router;
