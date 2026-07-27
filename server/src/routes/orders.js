const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { serializeOrder } = require('../utils/serializers');
const { createOrder, validateZone, ORDER_INCLUDE } = require('../services/orderService');
const { sendSms } = require('../services/sms');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  requireRole('CUSTOMER', 'BUSINESS'),
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
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    let where = {};
    if (req.user.role === 'CUSTOMER' || req.user.role === 'BUSINESS') {
      where = { customerId: req.user.id };
    } else if (req.user.role === 'RIDER') {
      where = { riderId: req.user.id };
    }
    if (req.query.status) where.status = req.query.status;

    const orders = await prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' } });
    res.json({ orders: orders.map(serializeOrder) });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: ORDER_INCLUDE });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const isOwner = order.customerId === req.user.id || order.riderId === req.user.id;
    if (!isOwner && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Not your order.' });

    res.json({ order: serializeOrder(order) });
  })
);

router.post(
  '/:id/pay',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payment: true } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.customerId !== req.user.id) return res.status(403).json({ error: 'Not your order.' });
    if (order.status === 'CANCELLED') return res.status(409).json({ error: 'This order was cancelled and can no longer be paid for.' });
    if (order.payment?.status === 'SUCCESS') return res.status(409).json({ error: 'Order already paid.' });

    const momoPhone = (req.body.momoPhone || req.user.phone || '').replace(/\s/g, '');
    const ok = Math.random() > 0.12; // simulated MTN MoMo confirmation — no live integration available

    const paymentData = {
      amount: order.cost,
      momoPhone,
      status: ok ? 'SUCCESS' : 'FAILED',
      transactionRef: 'MOMO-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    };

    await (order.payment
      ? prisma.payment.update({ where: { orderId: order.id }, data: paymentData })
      : prisma.payment.create({ data: { orderId: order.id, ...paymentData } }));

    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
    if (ok) {
      sendSms(req.user.phone, `Nyaruka: payment received for "${order.item}" (${order.cost} RWF). A rider will be assigned soon.`);
    }
    res.json({ ok, order: serializeOrder(updated) });
  })
);

router.post(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.customerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not your order.' });
    }
    // Business rule: once a rider is assigned, the order can no longer be cancelled.
    if (order.riderId || order.status !== 'PLACED') {
      return res.status(409).json({ error: 'This order can no longer be cancelled — a rider is already on the way.' });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: ORDER_INCLUDE,
    });
    res.json({ order: serializeOrder(updated) });
  })
);

router.post(
  '/:id/rate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { stars, comment } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { rating: true } });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.customerId !== req.user.id) return res.status(403).json({ error: 'Not your order.' });
    if (order.status !== 'DELIVERED') return res.status(409).json({ error: 'You can rate a delivery once it is complete.' });
    if (order.rating) return res.status(409).json({ error: 'This order has already been rated.' });
    if (!order.riderId) return res.status(409).json({ error: 'No rider to rate.' });

    const starsNum = Number(stars);
    if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    await prisma.rating.create({
      data: { orderId: order.id, riderId: order.riderId, stars: starsNum, comment: comment?.trim() || null },
    });

    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
    res.status(201).json({ order: serializeOrder(updated) });
  })
);

module.exports = router;
