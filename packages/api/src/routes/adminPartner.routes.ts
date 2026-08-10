import { Router } from 'express';
import { Partner, PartnerCommission, PartnerPayout, Restaurant, Subscription } from '../db/models/index.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { toIds } from '../db/serialize.js';
import { emitAdminEvent } from '../services/notification.service.js';

const router = Router();

router.use(requireAdminAuth);

/** GET /api/v1/admin/partners - List partners with search/filters */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    
    const query: any = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { partnerId: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const [partners, total] = await Promise.all([
      Partner.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Partner.countDocuments(query),
    ]);

    // Aggregate stats for each partner
    const partnerIds = partners.map(p => p.partnerId);
    
    // Get restaurants for these partners
    const restaurants = await Restaurant.find({ partnerId: { $in: partnerIds } }).select('_id partnerId').lean();
    const restMap: Record<string, string[]> = {};
    restaurants.forEach(r => {
      if (r.partnerId) {
        if (!restMap[r.partnerId]) restMap[r.partnerId] = [];
        restMap[r.partnerId].push(r._id as string);
      }
    });

    // Get active subscriptions for these restaurants
    const allRestIds = restaurants.map(r => r._id);
    const activeSubs = await Subscription.find({ 
      restaurantId: { $in: allRestIds }, 
      status: 'active' 
    }).select('restaurantId').lean();
    const activeRestIds = new Set(activeSubs.map(s => s.restaurantId));

    // Get earnings for these partners
    const commissions = await PartnerCommission.find({ partnerId: { $in: partnerIds } }).lean();
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const enriched = partners.map(p => {
      const pRests = restMap[p.partnerId] || [];
      const pActiveRests = pRests.filter(id => activeRestIds.has(id));
      const pComms = commissions.filter(c => c.partnerId === p.partnerId);
      
      const totalEarnings = pComms.reduce((sum, c) => sum + c.amount, 0);
      const thisMonthEarnings = pComms
        .filter(c => c.createdAt >= firstDayOfMonth)
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        id: p._id,
        partnerId: p.partnerId,
        fullName: p.fullName,
        mobileNumber: p.mobileNumber,
        email: p.email,
        city: p.city,
        qualification: p.qualification,
        status: p.status,
        createdAt: p.createdAt,
        totalRestaurants: pRests.length,
        activeRestaurants: pActiveRests.length,
        totalEarnings,
        thisMonthEarnings
      };
    });

    res.json({ data: enriched, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/v1/admin/partners/:partnerId - Partner Profile */
router.get('/:partnerId', async (req, res) => {
  try {
    const partner = await Partner.findOne({ partnerId: req.params.partnerId }).lean();
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    
    // Get stats
    const restaurants = await Restaurant.find({ partnerId: partner.partnerId }).lean();
    const restIds = restaurants.map(r => r._id);
    
    const activeSubs = await Subscription.find({ 
      restaurantId: { $in: restIds }, 
      status: 'active' 
    }).lean();
    const activeRestIds = new Set(activeSubs.map(s => s.restaurantId));

    const commissions = await PartnerCommission.find({ partnerId: partner.partnerId }).lean();
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0);
    const thisMonthEarnings = commissions.filter(c => c.createdAt >= firstDayOfMonth).reduce((sum, c) => sum + c.amount, 0);
    const pendingEarnings = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0);
    const paidEarnings = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);

    const stats = {
      totalRestaurants: restaurants.length,
      activeRestaurants: activeRestIds.size,
      pendingRestaurants: restaurants.length - activeRestIds.size,
      onboardedThisMonth: restaurants.filter(r => r.createdAt >= firstDayOfMonth).length,
      totalEarnings,
      thisMonthEarnings,
      pendingEarnings,
      paidEarnings
    };

    res.json({ partner: { ...partner, id: partner._id }, stats });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** PATCH /api/v1/admin/partners/:partnerId/status */
router.patch('/:partnerId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const partner = await Partner.findOneAndUpdate(
      { partnerId: req.params.partnerId },
      { status },
      { new: true }
    ).lean();

    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    emitAdminEvent('admin:partner_status_changed', { partnerId: partner.partnerId, status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/v1/admin/partners/:partnerId/restaurants */
router.get('/:partnerId/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ partnerId: req.params.partnerId }).lean();
    const restIds = restaurants.map(r => r._id);
    
    // We would fetch owner info, subscriptions, etc. 
    // Simplified for now, just returning the basic list with status
    const subs = await Subscription.find({ restaurantId: { $in: restIds } }).lean();
    const subMap = Object.fromEntries(subs.map(s => [s.restaurantId, s]));

    const data = restaurants.map(r => {
      const sub = subMap[r._id as string];
      return {
        id: r._id,
        name: r.name,
        city: 'N/A', // Assuming city isn't directly on restaurant model, you'd join owner
        status: sub?.status === 'active' ? 'Active' : 'Pending',
        subscriptionStart: sub?.activatedAt || null,
        nextRenewal: sub?.nextBillingAt || null,
        createdAt: r.createdAt
      };
    });

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/v1/admin/partners/:partnerId/commissions */
router.get('/:partnerId/commissions', async (req, res) => {
  try {
    const commissions = await PartnerCommission.find({ partnerId: req.params.partnerId }).sort({ createdAt: -1 }).lean();
    
    // Fetch restaurant details for context
    const restIds = commissions.map(c => c.restaurantId);
    const restaurants = await Restaurant.find({ _id: { $in: restIds } }).lean();
    const restMap = Object.fromEntries(restaurants.map(r => [r._id, r.name]));

    const data = commissions.map(c => ({
      id: c._id,
      date: c.createdAt,
      restaurantName: restMap[c.restaurantId] || 'Unknown',
      type: c.type,
      amount: c.amount,
      status: c.status,
      subscriptionId: c.subscriptionId
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** GET /api/v1/admin/partners/:partnerId/payouts */
router.get('/:partnerId/payouts', async (req, res) => {
  try {
    const payouts = await PartnerPayout.find({ partnerId: req.params.partnerId }).sort({ createdAt: -1 }).lean();
    res.json({ data: toIds(payouts) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/v1/admin/partners/:partnerId/payouts - Create new payout */
router.post('/:partnerId/payouts', async (req, res) => {
  try {
    const { amount, commissionIds, referenceId } = req.body;
    
    // Create payout record
    const payout = await PartnerPayout.create({
      partnerId: req.params.partnerId,
      amount,
      commissionIds,
      status: 'PAID',
      paidAt: new Date(),
      referenceId
    });

    // Mark commissions as PAID
    await PartnerCommission.updateMany(
      { _id: { $in: commissionIds }, partnerId: req.params.partnerId },
      { status: 'PAID', payoutId: payout._id }
    );

    emitAdminEvent('admin:payout_processed', { partnerId: req.params.partnerId, amount });

    res.json({ success: true, payout: { ...payout.toObject(), id: payout._id } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
