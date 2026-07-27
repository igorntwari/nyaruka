const express = require('express');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { serializeOrder } = require('../utils/serializers');
const { ORDER_INCLUDE } = require('../services/orderService');
const { sendSms } = require('../services/sms');

const router = express.Router();

router.use(requireAuth, requireRole('RIDER'));

router.use(
  asyncHandler(async (req, res, next) => {
    req.riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.user.id } });
    next();
  })
);

function requireVerified(req, res, next) {
  if (req.riderProfile?.status !== 'VERIFIED') {
    return res.status(403).json({ error: 'Your rider account is not verified yet.' });
  }
  next();
}

router.get(
  '/jobs',
  requireVerified,
  asyncHandler(async (req, res) => {
    const jobs = await prisma.order.findMany({
      where: { status: 'PLACED', riderId: null, payment: { status: 'SUCCESS' } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ jobs: jobs.map(serializeOrder) });
  })
);

router.post(
  '/jobs/:id/accept',
  requireVerified,
  asyncHandler(async (req, res) => {
    // updateMany + where riderId:null avoids a race where two riders accept the same job at once.
    const result = await prisma.order.updateMany({
      where: { id: req.params.id, status: 'PLACED', riderId: null },
      data: { riderId: req.user.id, status: 'ASSIGNED', assignedAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(409).json({ error: 'This job is no longer available.' });
    }
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
    if (order.customer) {
      sendSms(order.customer.phone, `Nyaruka: a rider has been assigned to your order "${order.item}".`);
    }
    res.json({ order: serializeOrder(order) });
  })
);

router.get(
  '/my-jobs',
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { riderId: req.user.id, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  })
);

router.patch(
  '/jobs/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.riderId !== req.user.id) return res.status(403).json({ error: 'This is not your job.' });

    const transitions = { ASSIGNED: 'PICKED_UP', PICKED_UP: 'DELIVERED' };
    if (transitions[order.status] !== status) {
      return res.status(409).json({ error: `Cannot move from ${order.status} to ${status}.` });
    }

    const data = { status };
    if (status === 'PICKED_UP') data.pickedUpAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();

    const updated = await prisma.order.update({ where: { id: order.id }, data, include: ORDER_INCLUDE });
    if (updated.customer) {
      const msg = status === 'DELIVERED' ? 'has been delivered. Thank you!' : 'has been picked up by your rider.';
      sendSms(updated.customer.phone, `Nyaruka: your order "${updated.item}" ${msg}`);
    }
    res.json({ order: serializeOrder(updated) });
  })
);

router.get(
  '/earnings',
  asyncHandler(async (req, res) => {
    const delivered = await prisma.order.findMany({
      where: { riderId: req.user.id, status: 'DELIVERED' },
      select: { id: true, riderPayout: true, deliveredAt: true, item: true, dropoff: true },
      orderBy: { deliveredAt: 'desc' },
    });
    const totalEarnings = delivered.reduce((sum, o) => sum + o.riderPayout, 0);
    const ratingAgg = await prisma.rating.aggregate({
      where: { riderId: req.user.id },
      _avg: { stars: true },
      _count: true,
    });

    res.json({
      totalEarnings,
      deliveredCount: delivered.length,
      averageRating: ratingAgg._avg.stars || null,
      ratingCount: ratingAgg._count,
      deliveries: delivered,
    });
  })
);

module.exports = router;
