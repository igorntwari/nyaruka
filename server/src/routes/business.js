const express = require('express');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { serializeOrder } = require('../utils/serializers');
const { createOrder, validateZone, ORDER_INCLUDE } = require('../services/orderService');

const router = express.Router();

router.use(requireAuth, requireRole('BUSINESS'));

router.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const { pickup, pickupZone, dropoff, dropoffZone, item, weight } = req.body;
    if (!pickup?.trim()) return res.status(400).json({ error: 'Where should the rider collect this from?' });
    if (!dropoff?.trim()) return res.status(400).json({ error: 'Where is this going?' });
    if (!item?.trim()) return res.status(400).json({ error: 'What are we delivering?' });
    if (!validateZone(pickupZone)) return res.status(400).json({ error: 'Choose a valid pickup zone.' });
    if (!validateZone(dropoffZone)) return res.status(400).json({ error: 'Choose a valid drop-off zone.' });

    const order = await createOrder(req.user.id, { pickup, pickupZone, dropoff, dropoffZone, item, weight });
    res.status(201).json({ order: serializeOrder(order) });
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  })
);

module.exports = router;
