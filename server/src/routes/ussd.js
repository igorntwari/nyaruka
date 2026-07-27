const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const sessionStore = require('../ussd/sessionStore');
const { sendSms } = require('../services/sms');
const { estimateCost, riderPayout } = require('../utils/pricing');
const { ZONES, ZONE_LABEL } = require('../services/orderService');

const router = express.Router();

// Africa's Talking sends phone numbers in E.164 (+250...); our accounts use
// local 07XXXXXXXX numbers. USSD simulators sometimes send the local form
// directly too, so this accepts either.
function toLocalPhone(phone) {
  if (phone.startsWith('+250')) return '0' + phone.slice(4);
  if (phone.startsWith('250')) return '0' + phone.slice(3);
  return phone;
}

function zoneMenu() {
  return ZONES.map((z, i) => `${i + 1}. ${ZONE_LABEL[z]}`).join('\n');
}

function rootMenuFor(user) {
  if (!user) {
    return {
      step: 'REGISTER_ROLE',
      message: 'CON Welcome to Nyaruka\n1. Register as Customer\n2. Register as Rider',
    };
  }
  if (user.role === 'ADMIN') {
    return { step: 'END', message: 'END This service is not available for admin accounts.' };
  }
  if (user.role === 'RIDER') {
    return {
      step: 'RIDER_ROOT',
      message: `CON Muraho ${user.name.split(' ')[0]}\n1. Available jobs\n2. My active delivery\n3. Check balance\n4. Withdraw earnings\n5. Close my account`,
    };
  }
  // CUSTOMER or BUSINESS
  return {
    step: 'CUSTOMER_ROOT',
    message: `CON Muraho ${user.name.split(' ')[0]}\n1. Place a delivery\n2. Track my orders\n3. My account`,
  };
}

async function handleStep(session, input, phoneNumber) {
  const user = await prisma.user.findUnique({ where: { phone: phoneNumber }, include: { riderProfile: true } });

  // A fresh dial-in (no session yet) always starts at the root menu.
  if (!session) {
    return { ...rootMenuFor(user), data: {} };
  }

  switch (session.step) {
    case 'REGISTER_ROLE': {
      if (input === '1') return { step: 'REGISTER_CUSTOMER_NAME', message: 'CON Enter your full name:', data: {} };
      if (input === '2') return { step: 'REGISTER_RIDER_NAME', message: 'CON Enter your full name:', data: {} };
      return { step: 'END', message: 'END Invalid choice. Please dial in again.' };
    }

    case 'REGISTER_CUSTOMER_NAME': {
      const name = input.trim();
      if (name.length < 2) return { step: 'REGISTER_CUSTOMER_NAME', message: 'CON Please enter your full name:', data: {} };
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      await prisma.user.create({ data: { name, phone: phoneNumber, passwordHash, role: 'CUSTOMER' } });
      return { step: 'END', message: `END Welcome to Nyaruka, ${name}! Dial in again any time to place a delivery.` };
    }

    case 'REGISTER_RIDER_NAME': {
      const name = input.trim();
      if (name.length < 2) return { step: 'REGISTER_RIDER_NAME', message: 'CON Please enter your full name:', data: {} };
      return { step: 'REGISTER_RIDER_ZONE', message: `CON Select your home zone (used to show nearby jobs):\n${zoneMenu()}`, data: { name } };
    }

    case 'REGISTER_RIDER_ZONE': {
      const idx = parseInt(input, 10) - 1;
      const zone = ZONES[idx];
      if (!zone) return { step: 'REGISTER_RIDER_ZONE', message: `CON Invalid zone. Select your home zone:\n${zoneMenu()}`, data: session.data };
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      await prisma.user.create({
        data: {
          name: session.data.name,
          phone: phoneNumber,
          passwordHash,
          role: 'RIDER',
          riderProfile: { create: { homeZone: zone } },
        },
      });
      return {
        step: 'END',
        message: 'END Registration submitted! Your account is pending admin verification. Dial in again once verified to see nearby jobs.',
      };
    }

    case 'CUSTOMER_ROOT': {
      if (input === '1') {
        return { step: 'ORDER_PICKUP_ZONE', message: `CON Select pickup zone:\n${zoneMenu()}`, data: {} };
      }
      if (input === '2') {
        const orders = await prisma.order.findMany({
          where: { customerId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
        if (orders.length === 0) return { step: 'END', message: 'END You have no orders yet.' };
        const list = orders.map((o, i) => `${i + 1}. ${o.item} - ${o.status} - ${o.cost} RWF`).join('\n');
        return { step: 'END', message: `END Your recent orders:\n${list}` };
      }
      if (input === '3') {
        const count = await prisma.order.count({ where: { customerId: user.id } });
        return { step: 'END', message: `END ${user.name}\n${user.phone}\nTotal orders: ${count}` };
      }
      return { step: 'END', message: 'END Invalid choice.' };
    }

    case 'ORDER_PICKUP_ZONE': {
      const idx = parseInt(input, 10) - 1;
      const zone = ZONES[idx];
      if (!zone) return { step: 'ORDER_PICKUP_ZONE', message: `CON Invalid zone. Select pickup zone:\n${zoneMenu()}`, data: session.data };
      return { step: 'ORDER_DROPOFF_ZONE', message: `CON Select drop-off zone:\n${zoneMenu()}`, data: { pickupZone: zone } };
    }

    case 'ORDER_DROPOFF_ZONE': {
      const idx = parseInt(input, 10) - 1;
      const zone = ZONES[idx];
      if (!zone) return { step: 'ORDER_DROPOFF_ZONE', message: `CON Invalid zone. Select drop-off zone:\n${zoneMenu()}`, data: session.data };
      return {
        step: 'ORDER_ITEM',
        message: 'CON What are you sending? (e.g. Documents)',
        data: { ...session.data, dropoffZone: zone },
      };
    }

    case 'ORDER_ITEM': {
      const item = input.trim() || 'Package';
      return { step: 'ORDER_WEIGHT', message: 'CON Estimated weight in kg (e.g. 1):', data: { ...session.data, item } };
    }

    case 'ORDER_WEIGHT': {
      const weight = parseFloat(input) || 1;
      const { pickupZone, dropoffZone, item } = session.data;
      const cost = estimateCost(weight);
      const order = await prisma.order.create({
        data: {
          customerId: user.id,
          pickup: ZONE_LABEL[pickupZone],
          pickupZone,
          dropoff: ZONE_LABEL[dropoffZone],
          dropoffZone,
          item,
          weight,
          cost,
          riderPayout: riderPayout(cost),
        },
      });

      const paid = Math.random() > 0.12; // simulated MTN MoMo confirmation
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: cost,
          momoPhone: phoneNumber,
          status: paid ? 'SUCCESS' : 'FAILED',
          transactionRef: 'MOMO-USSD-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
        },
      });

      if (paid) {
        sendSms(phoneNumber, `Nyaruka: order placed (${item}, ${cost} RWF). A rider will be assigned soon.`);
      }

      return {
        step: 'END',
        message: paid
          ? `END Order placed!\nID: ${order.id.slice(0, 10).toUpperCase()}\nCost: ${cost} RWF\nPayment: SUCCESS\nA rider will be assigned soon.`
          : `END Order placed but payment FAILED.\nID: ${order.id.slice(0, 10).toUpperCase()}\nOpen the Nyaruka app to retry payment.`,
      };
    }

    case 'RIDER_ROOT': {
      if (input === '1') {
        const zoneFilter = user.riderProfile?.homeZone
          ? { OR: [{ pickupZone: user.riderProfile.homeZone }, { dropoffZone: user.riderProfile.homeZone }] }
          : {};
        const jobs = await prisma.order.findMany({
          where: { status: 'PLACED', riderId: null, payment: { status: 'SUCCESS' }, ...zoneFilter },
          orderBy: { createdAt: 'asc' },
          take: 5,
        });
        if (jobs.length === 0) return { step: 'END', message: 'END No available jobs near you right now.' };
        const zoneLabel = user.riderProfile?.homeZone ? ZONE_LABEL[user.riderProfile.homeZone] : 'you';
        const list = jobs.map((j, i) => `${i + 1}. ${j.item} - ${j.riderPayout} RWF`).join('\n');
        return {
          step: 'RIDER_JOBS_LIST',
          message: `CON Jobs near ${zoneLabel}:\n${list}\n0. Back`,
          data: { jobIds: jobs.map((j) => j.id) },
        };
      }
      if (input === '2') {
        const order = await prisma.order.findFirst({
          where: { riderId: user.id, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
          orderBy: { createdAt: 'desc' },
        });
        if (!order) return { step: 'END', message: 'END You have no active delivery.' };
        const nextStatus = order.status === 'ASSIGNED' ? 'PICKED_UP' : 'DELIVERED';
        const actionLabel = nextStatus === 'PICKED_UP' ? 'Mark picked up' : 'Mark delivered';
        return {
          step: 'RIDER_ACTIVE_ACTION',
          message: `CON Order: ${order.item}\n${ZONE_LABEL[order.pickupZone]} -> ${ZONE_LABEL[order.dropoffZone]}\nStatus: ${order.status}\n1. ${actionLabel}\n0. Back`,
          data: { orderId: order.id, nextStatus },
        };
      }
      if (input === '3') {
        const delivered = await prisma.order.findMany({ where: { riderId: user.id, status: 'DELIVERED' }, select: { riderPayout: true } });
        const total = delivered.reduce((sum, o) => sum + o.riderPayout, 0);
        return { step: 'END', message: `END Balance: ${total} RWF from ${delivered.length} deliveries.` };
      }
      if (input === '4') {
        const delivered = await prisma.order.findMany({ where: { riderId: user.id, status: 'DELIVERED' }, select: { riderPayout: true } });
        const total = delivered.reduce((sum, o) => sum + o.riderPayout, 0);
        if (total === 0) return { step: 'END', message: 'END You have no earnings to withdraw yet.' };
        sendSms(phoneNumber, `Nyaruka: your withdrawal of ${total} RWF to ${phoneNumber} has been processed.`);
        return { step: 'END', message: `END Withdrawal of ${total} RWF requested. You'll receive an SMS confirmation.` };
      }
      if (input === '5') {
        return { step: 'RIDER_CLOSE_CONFIRM', message: 'CON Are you sure you want to close your account?\n1. Yes\n2. No', data: {} };
      }
      return { step: 'END', message: 'END Invalid choice.' };
    }

    case 'RIDER_JOBS_LIST': {
      if (input === '0') return { ...rootMenuFor(user), data: {} };
      const idx = parseInt(input, 10) - 1;
      const jobId = (session.data.jobIds || [])[idx];
      if (!jobId) return { step: 'END', message: 'END Invalid selection.' };

      const result = await prisma.order.updateMany({
        where: { id: jobId, status: 'PLACED', riderId: null },
        data: { riderId: user.id, status: 'ASSIGNED', assignedAt: new Date() },
      });
      if (result.count === 0) return { step: 'END', message: 'END Sorry, that job is no longer available.' };

      const order = await prisma.order.findUnique({ where: { id: jobId }, include: { customer: true } });
      if (order?.customer) {
        sendSms(order.customer.phone, `Nyaruka: a rider has been assigned to your order (${order.item}).`);
      }
      return { step: 'END', message: `END Job accepted! Head to ${ZONE_LABEL[order.pickupZone]} for pickup.` };
    }

    case 'RIDER_ACTIVE_ACTION': {
      if (input === '0') return { ...rootMenuFor(user), data: {} };
      if (input !== '1') return { step: 'END', message: 'END Invalid choice.' };

      const { orderId, nextStatus } = session.data;
      const data = { status: nextStatus };
      if (nextStatus === 'PICKED_UP') data.pickedUpAt = new Date();
      if (nextStatus === 'DELIVERED') data.deliveredAt = new Date();

      const order = await prisma.order.update({ where: { id: orderId }, data, include: { customer: true } });
      if (order.customer) {
        const msg = nextStatus === 'DELIVERED' ? 'Your order has been delivered. Thank you!' : 'Your rider has picked up your order.';
        sendSms(order.customer.phone, `Nyaruka: ${msg}`);
      }
      return { step: 'END', message: `END Status updated to ${nextStatus}.` };
    }

    case 'RIDER_CLOSE_CONFIRM': {
      if (input === '1') {
        await prisma.riderProfile.update({ where: { userId: user.id }, data: { status: 'SUSPENDED' } });
        await prisma.user.update({ where: { id: user.id }, data: { authToken: null } });
        return { step: 'END', message: 'END Your account has been closed. Thank you for riding with Nyaruka.' };
      }
      return { step: 'END', message: 'END Account not closed.' };
    }

    default:
      return { ...rootMenuFor(user), data: {} };
  }
}

router.post(
  '/',
  express.urlencoded({ extended: false }),
  asyncHandler(async (req, res) => {
    const { sessionId, text } = req.body;
    const phoneNumber = toLocalPhone(req.body.phoneNumber || '');
    const input = (text || '').split('*').filter(Boolean).pop() || '';

    const existing = sessionStore.get(sessionId);
    const result = await handleStep(existing, input, phoneNumber);

    res.set('Content-Type', 'text/plain');
    if (result.message.startsWith('END')) {
      sessionStore.clear(sessionId);
    } else {
      sessionStore.set(sessionId, { step: result.step, data: result.data || {} });
    }
    res.send(result.message);
  })
);

module.exports = router;
