import { Router, Request, Response } from 'express';
import { getMenuBySlug, getDishById } from '../services/menu.service';

const router = Router();

// GET /api/v1/menu/:restaurantSlug
router.get('/:restaurantSlug', async (req: Request, res: Response) => {
  const { restaurantSlug } = req.params;

  if (!restaurantSlug || typeof restaurantSlug !== 'string') {
    res.status(400).json({ error: 'restaurantSlug is required', code: 'INVALID_PARAMS' });
    return;
  }

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

// GET /api/v1/dish/:dishId
router.get('/dish/:dishId', async (req: Request, res: Response) => {
  const { dishId } = req.params;

  try {
    const dish = await getDishById(dishId);
    if (!dish) {
      res.status(404).json({ error: 'Dish not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: dish });
  } catch (err) {
    console.error('GET /dish/:dishId error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
