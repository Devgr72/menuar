import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDishById, getDishModelStatus } from '../services/menu.service.js';
import { startPipeline } from '../services/pipeline.service.js';

const router = Router();

// Multer — disk storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  },
});

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

// POST /api/v1/dish/:dishId/photo
// Accepts: multipart/form-data with field "photo"
// Triggers full pipeline: bg removal → Tripo3D → GLB → ready
router.post('/:dishId/photo', upload.single('photo'), async (req: Request, res: Response) => {
  const { dishId } = req.params;

  if (!req.file) {
    res.status(400).json({ error: 'No photo uploaded', code: 'MISSING_FILE' });
    return;
  }

  try {
    const dish = await getDishById(dishId);
    if (!dish) {
      res.status(404).json({ error: 'Dish not found', code: 'NOT_FOUND' });
      return;
    }

    // Respond immediately — pipeline runs in background
    res.status(202).json({
      data: { dishId, modelStatus: 'bg_removing', message: 'Processing started' },
    });

    // Fire-and-forget — do NOT await
    startPipeline(dishId, req.file.buffer).catch((err) =>
      console.error(`[pipeline] Unhandled error for dish ${dishId}:`, err)
    );

  } catch (err) {
    console.error('POST /dish/:dishId/photo error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
});

export default router;
