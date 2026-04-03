import { Router, Request, Response } from 'express';
import { getDishById, getDishModelStatus } from '../services/menu.service';

const router = Router();

// GET /api/v1/dish/:dishId
router.get('/:dishId', async (req: Request, res: Response) => {
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

// GET /api/v1/dish/:dishId/model-status
// Frontend polls this while model is being generated
router.get('/:dishId/model-status', async (req: Request, res: Response) => {
  const { dishId } = req.params;

  try {
    const status = await getDishModelStatus(dishId);
    if (!status) {
      res.status(404).json({ error: 'Dish not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: status });
  } catch (err) {
    console.error('GET /dish/:dishId/model-status error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
