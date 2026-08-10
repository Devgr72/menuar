import { Router, Request, Response } from 'express';
import { PartnerNotification } from '../db/models/index.js';
import { requirePartnerAuth } from '../middleware/partnerAuth.js';

const router = Router();

// Apply auth middleware to all routes in this file
router.use(requirePartnerAuth);

// GET /api/v1/partner-notification
// Supports ?page=1&limit=20
router.get('/', async (req: Request, res: Response) => {
  try {
    const partnerId = req.partner!.partnerId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      PartnerNotification.find({ partnerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PartnerNotification.countDocuments({ partnerId })
    ]);

    res.json({
      data: notifications.map(n => ({
        id: n._id.toString(),
        partnerId: n.partnerId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Fetch Partner Notifications Error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// GET /api/v1/partner-notification/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await PartnerNotification.countDocuments({
      partnerId: req.partner!.partnerId,
      isRead: false
    });
    res.json({ count });
  } catch (err) {
    console.error('Fetch Unread Count Error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
});

// POST /api/v1/partner-notification/:id/read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await PartnerNotification.findOneAndUpdate(
      { _id: req.params.id, partnerId: req.partner!.partnerId },
      { $set: { isRead: true } },
      { new: true }
    );
    
    if (!result) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark as read Error:', err);
    res.status(500).json({ error: 'Failed to mark as read.' });
  }
});

// POST /api/v1/partner-notification/read-all
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    await PartnerNotification.updateMany(
      { partnerId: req.partner!.partnerId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark all as read Error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export default router;
