const express = require('express');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sanitizeUser, serializeOrder } = require('../utils/serializers');
const { sendSms } = require('../services/sms');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/riders',
  asyncHandler(async (req, res) => {
    const riders = await prisma.user.findMany({
      where: { role: 'RIDER' },
      include: { riderProfile: true },
      orderBy: { createdAt: 'desc' },
    });

    const withStats = await Promise.all(
      riders.map(async (r) => {
        const [deliveredCount, ratingAgg] = await Promise.all([
          prisma.order.count({ where: { riderId: r.id, status: 'DELIVERED' } }),
          prisma.rating.aggregate({ where: { riderId: r.id }, _avg: { stars: true } }),
        ]);
        return { ...sanitizeUser(r), deliveredCount, averageRating: ratingAgg._avg.stars || null };
      })
    );

    res.json({ riders: withStats });
  })
);

router.patch(
  '/riders/:id/verify',
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['PENDING', 'VERIFIED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const profile = await prisma.riderProfile.update({ where: { userId: req.params.id }, data: { status } });
    res.json({ riderProfile: profile });
  })
);

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const where = {};
    if (!req.query.status) {
      where.status = { notIn: ['DELIVERED', 'CANCELLED'] }; // "active" orders by default
    } else if (req.query.status !== 'ALL') {
      where.status = req.query.status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { customer: true, rider: true, payment: true, rating: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  })
);

router.patch(
  '/orders/:id/assign',
  asyncHandler(async (req, res) => {
    const { riderId } = req.body;
    const [order, rider] = await Promise.all([
      prisma.order.findUnique({ where: { id: req.params.id }, include: { payment: true } }),
      prisma.user.findUnique({ where: { id: riderId }, include: { riderProfile: true } }),
    ]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.riderId) return res.status(409).json({ error: 'Order already has a rider assigned.' });
    if (order.payment?.status !== 'SUCCESS') return res.status(409).json({ error: 'Order has not been paid for yet.' });
    if (!rider || rider.role !== 'RIDER') return res.status(400).json({ error: 'Not a valid rider.' });
    if (rider.riderProfile?.status !== 'VERIFIED') return res.status(409).json({ error: 'Rider is not verified.' });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { riderId, status: 'ASSIGNED', assignedAt: new Date() },
      include: { customer: true, rider: true, payment: true, rating: true },
    });
    if (updated.customer) {
      sendSms(updated.customer.phone, `Nyaruka: a rider has been assigned to your order "${updated.item}".`);
    }
    res.json({ order: serializeOrder(updated) });
  })
);

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleString('en', { month: 'short', year: '2-digit' });
}

// Last N calendar months, oldest first, including the current month.
function lastNMonths(n) {
  const now = new Date();
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d) });
  }
  return months;
}

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const months = lastNMonths(6);
    const windowStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

    const [
      totalDeliveries,
      revenueAgg,
      activeRiders,
      totalRiders,
      pendingRiders,
      suspendedRiders,
      totalCustomers,
      totalBusinesses,
      totalOrders,
      cancelledOrders,
      avgRatingAgg,
      deliveredZones,
      statusGroups,
      deliveredInWindow,
      usersInWindow,
      ratingsInWindow,
    ] = await Promise.all([
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { cost: true } }),
      prisma.riderProfile.count({ where: { status: 'VERIFIED' } }),
      prisma.user.count({ where: { role: 'RIDER' } }),
      prisma.riderProfile.count({ where: { status: 'PENDING' } }),
      prisma.riderProfile.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { role: 'BUSINESS' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.rating.aggregate({ _avg: { stars: true } }),
      prisma.order.findMany({ where: { status: 'DELIVERED' }, select: { dropoffZone: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.findMany({
        where: { status: 'DELIVERED', deliveredAt: { gte: windowStart } },
        select: { deliveredAt: true, cost: true },
      }),
      prisma.user.findMany({
        where: { role: { in: ['RIDER', 'CUSTOMER'] }, createdAt: { gte: windowStart } },
        select: { createdAt: true, role: true },
      }),
      prisma.rating.findMany({ where: { createdAt: { gte: windowStart } }, select: { createdAt: true, stars: true } }),
    ]);

    const zoneCounts = {};
    for (const o of deliveredZones) {
      zoneCounts[o.dropoffZone] = (zoneCounts[o.dropoffZone] || 0) + 1;
    }
    const busiestZones = Object.entries(zoneCounts)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count);

    const ordersByStatus = statusGroups
      .map((g) => ({ status: g.status, count: g._count._all }))
      .sort((a, b) => b.count - a.count);

    const buckets = {};
    for (const m of months) {
      buckets[m.key] = { month: m.label, deliveries: 0, revenue: 0, newRiders: 0, newCustomers: 0, ratingSum: 0, ratingCount: 0 };
    }
    for (const o of deliveredInWindow) {
      const b = buckets[monthKey(o.deliveredAt)];
      if (b) {
        b.deliveries++;
        b.revenue += o.cost;
      }
    }
    for (const u of usersInWindow) {
      const b = buckets[monthKey(u.createdAt)];
      if (!b) continue;
      if (u.role === 'RIDER') b.newRiders++;
      if (u.role === 'CUSTOMER') b.newCustomers++;
    }
    for (const r of ratingsInWindow) {
      const b = buckets[monthKey(r.createdAt)];
      if (!b) continue;
      b.ratingSum += r.stars;
      b.ratingCount++;
    }

    const monthly = months.map((m) => {
      const b = buckets[m.key];
      return {
        month: b.month,
        deliveries: b.deliveries,
        revenue: b.revenue,
        newRiders: b.newRiders,
        newCustomers: b.newCustomers,
        averageRating: b.ratingCount ? Math.round((b.ratingSum / b.ratingCount) * 10) / 10 : null,
      };
    });

    res.json({
      totalDeliveries,
      totalRevenue: revenueAgg._sum.cost || 0,
      activeRiders,
      totalRiders,
      pendingRiders,
      suspendedRiders,
      totalCustomers,
      totalBusinesses,
      totalOrders,
      cancelledOrders,
      averageRating: avgRatingAgg._avg.stars || null,
      busiestZones,
      ordersByStatus,
      monthly,
    });
  })
);

module.exports = router;
