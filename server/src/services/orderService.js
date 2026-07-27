const { prisma } = require('../db');
const { estimateCost, riderPayout } = require('../utils/pricing');

const ZONES = [
  'KIMIRONKO',
  'NYARUTARAMA',
  'REMERA',
  'KACYIRU',
  'KIMISAGARA',
  'NYAMIRAMBO',
  'GIKONDO',
  'KICUKIRO',
  'GISOZI',
  'KABEZA',
];

const ZONE_LABEL = {
  KIMIRONKO: 'Kimironko',
  NYARUTARAMA: 'Nyarutarama',
  REMERA: 'Remera',
  KACYIRU: 'Kacyiru',
  KIMISAGARA: 'Kimisagara',
  NYAMIRAMBO: 'Nyamirambo',
  GIKONDO: 'Gikondo',
  KICUKIRO: 'Kicukiro',
  GISOZI: 'Gisozi',
  KABEZA: 'Kabeza',
};

function validateZone(zone) {
  return ZONES.includes(zone);
}

const ORDER_INCLUDE = { customer: true, rider: true, payment: true, rating: true };

async function createOrder(customerId, { pickup, pickupZone, dropoff, dropoffZone, item, weight }) {
  const cost = estimateCost(weight);
  return prisma.order.create({
    data: {
      customerId,
      pickup: pickup.trim(),
      pickupZone,
      dropoff: dropoff.trim(),
      dropoffZone,
      item: item.trim(),
      weight: parseFloat(weight) || 1,
      cost,
      riderPayout: riderPayout(cost),
    },
    include: ORDER_INCLUDE,
  });
}

module.exports = { createOrder, ZONES, ZONE_LABEL, validateZone, ORDER_INCLUDE };
