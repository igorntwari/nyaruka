require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { estimateCost, riderPayout } = require('../src/utils/pricing');

const prisma = new PrismaClient();

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

// A venue or two per zone, used to build believable pickup/dropoff strings.
const VENUES = {
  KIMIRONKO: ['Kimironko Market', 'Paka Juice, Kimironko', 'Simba Supermarket Kimironko'],
  NYARUTARAMA: ['Nyarutarama Golf Course', 'Kigali Marriott area', 'Nyarutarama house 12'],
  REMERA: ['Remera Round-about', 'La Galette Bakery, Remera', 'Amahoro Stadium'],
  KACYIRU: ['Kacyiru Ministry area', 'Kacyiru Market', 'Question Coffee, Kacyiru'],
  KIMISAGARA: ['Kimisagara Market', 'Kimisagara Stadium', 'Kimisagara health center'],
  NYAMIRAMBO: ['Nyamirambo Stadium', 'Nyamirambo Women\'s Center', 'Biryogo Market'],
  GIKONDO: ['Gikondo Industrial Zone', 'Gikondo Market', 'Sulfo Rwanda area'],
  KICUKIRO: ['Kicukiro Centre', 'Sonatubes Market, Kicukiro', 'Kagarama area'],
  GISOZI: ['Gisozi Genocide Memorial area', 'Gisozi Market', 'Gisozi bus stop'],
  KABEZA: ['Kabeza Market', 'Kabeza main road', 'Kabeza junction'],
};

const ITEMS = [
  'Chapati and juice',
  'Grocery bag',
  'Documents',
  'Phone charger',
  'Birthday cake',
  'Vegetables',
  'Sealed package',
  'Medicine from pharmacy',
  'School books',
  'Pair of shoes',
  'Electronics parcel',
  'Fresh produce crate',
];

const RIDER_NAMES = [
  'Eric Mugisha', 'Aline Uwase', 'Jean Bosco Nkusi', 'Claudine Mukamana', 'Patrick Habimana',
  'Divine Ingabire', 'Emmanuel Nshuti', 'Solange Umutoni', 'Fabrice Ndayishimiye', 'Grace Uwimana',
  'Innocent Bizimana', 'Diane Uwera', 'Olivier Hakizimana',
];

const CUSTOMER_NAMES = [
  'Alice Umuhoza', 'Bosco Rugamba', 'Chantal Mukeshimana', 'David Niyonsenga', 'Esperance Mukamurenzi',
  'Felix Twagirayezu', 'Gisele Nyirahabimana', 'Hakim Ntawuyirushintege', 'Immaculee Ingabire', 'Jules Mugabo',
  'Kevin Iradukunda', 'Liliane Umutesi', 'Moses Byiringiro', 'Nadia Uwamahoro', 'Omar Nzeyimana',
  'Peace Mukandayisenga', 'Quentin Ntagungira', 'Rachel Umutoniwase', 'Samuel Gasana', 'Teta Umuhire',
  'Uwase Diane', 'Vincent Habyarimana', 'Winnie Akimana', 'Xavier Ndikumana', 'Yves Mugenzi', 'Zawadi Keza',
];

const BUSINESSES = [
  { businessName: 'Paka Juice', contact: 'Aimee Kagoyire', address: 'Kimironko Market, Stall 14' },
  { businessName: 'Inzuki Bakery', contact: 'Robert Sano', address: 'Remera, KG 11 Ave' },
  { businessName: 'Question Coffee', contact: 'Chiara Assi', address: 'Kacyiru, KG 7 Ave' },
  { businessName: 'Simba Supermarket', contact: 'Deo Munyaneza', address: 'Kimironko Rd' },
  { businessName: 'Mama Africa Restaurant', contact: 'Josephine Mutesi', address: 'Kigali City Tower' },
];

const PASSWORD = 'password123';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomZone() {
  return pick(ZONES);
}

function phoneFor(index) {
  return '07' + String(20000000 + index).padStart(8, '0');
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000 - Math.random() * 6 * 60 * 60 * 1000);
}

function minutesAfter(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.rating.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.riderProfile.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let phoneIndex = 0;
  const nextPhone = () => phoneFor(phoneIndex++);

  console.log('Creating admin...');
  await prisma.user.create({
    data: {
      name: 'Nyaruka Admin',
      phone: nextPhone(),
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Creating riders...');
  const riders = [];
  for (let i = 0; i < RIDER_NAMES.length; i++) {
    // Mostly verified so the demo has riders to assign jobs to; a couple pending/suspended for the admin screen.
    const status = i < 9 ? 'VERIFIED' : i < 11 ? 'PENDING' : 'SUSPENDED';
    const rider = await prisma.user.create({
      data: {
        name: RIDER_NAMES[i],
        phone: nextPhone(),
        passwordHash,
        role: 'RIDER',
        riderProfile: { create: { status } },
      },
      include: { riderProfile: true },
    });
    riders.push(rider);
  }
  const verifiedRiders = riders.filter((r) => r.riderProfile.status === 'VERIFIED');

  console.log('Creating businesses...');
  const businesses = [];
  for (const b of BUSINESSES) {
    const business = await prisma.user.create({
      data: {
        name: b.contact,
        phone: nextPhone(),
        passwordHash,
        role: 'BUSINESS',
        businessProfile: { create: { businessName: b.businessName, address: b.address } },
      },
    });
    businesses.push(business);
  }

  console.log('Creating customers...');
  const customers = [];
  for (const name of CUSTOMER_NAMES) {
    const customer = await prisma.user.create({
      data: { name, phone: nextPhone(), passwordHash, role: 'CUSTOMER' },
    });
    customers.push(customer);
  }

  const placers = [...customers, ...customers, ...customers, ...customers, ...businesses]; // ~80/20 customer/business mix

  function buildOrderData(placerId) {
    const pickupZone = randomZone();
    const dropoffZone = randomZone();
    const weight = (Math.random() * 4 + 0.5).toFixed(1);
    const cost = estimateCost(weight);
    return {
      customerId: placerId,
      pickup: pick(VENUES[pickupZone]),
      pickupZone,
      dropoff: pick(VENUES[dropoffZone]),
      dropoffZone,
      item: pick(ITEMS),
      weight: parseFloat(weight),
      cost,
      riderPayout: riderPayout(cost),
    };
  }

  console.log('Creating orders...');
  let created = 0;

  // 20 DELIVERED — the bulk of "history", mostly rated well.
  for (let i = 0; i < 20; i++) {
    const placer = pick(placers);
    const rider = pick(verifiedRiders);
    const createdAt = daysAgo(Math.floor(Math.random() * 20) + 1);
    const assignedAt = minutesAfter(createdAt, 5 + Math.random() * 15);
    const pickedUpAt = minutesAfter(assignedAt, 5 + Math.random() * 15);
    const deliveredAt = minutesAfter(pickedUpAt, 10 + Math.random() * 25);
    const orderData = buildOrderData(placer.id);

    const order = await prisma.order.create({
      data: {
        ...orderData,
        riderId: rider.id,
        status: 'DELIVERED',
        createdAt,
        assignedAt,
        pickedUpAt,
        deliveredAt,
        payment: {
          create: {
            amount: orderData.cost,
            momoPhone: placer.phone,
            status: 'SUCCESS',
            transactionRef: 'MOMO-SEED-' + i,
          },
        },
      },
    });

    // ~85% rated, skewed positive
    if (Math.random() < 0.85) {
      const stars = Math.random() < 0.75 ? pick([4, 5, 5]) : pick([2, 3]);
      await prisma.rating.create({
        data: {
          orderId: order.id,
          riderId: rider.id,
          stars,
          comment: stars >= 4 ? 'Fast and friendly, thank you!' : 'Delivery took a bit long.',
          createdAt: deliveredAt,
        },
      });
    }
    created++;
  }

  // 10 ASSIGNED
  for (let i = 0; i < 10; i++) {
    const placer = pick(placers);
    const rider = pick(verifiedRiders);
    const createdAt = daysAgo(Math.random());
    const assignedAt = minutesAfter(createdAt, 5 + Math.random() * 10);
    const orderData = buildOrderData(placer.id);
    await prisma.order.create({
      data: {
        ...orderData,
        riderId: rider.id,
        status: 'ASSIGNED',
        createdAt,
        assignedAt,
        payment: {
          create: { amount: orderData.cost, momoPhone: placer.phone, status: 'SUCCESS', transactionRef: 'MOMO-SEED-A' + i },
        },
      },
    });
    created++;
  }

  // 8 PICKED_UP
  for (let i = 0; i < 8; i++) {
    const placer = pick(placers);
    const rider = pick(verifiedRiders);
    const createdAt = daysAgo(Math.random());
    const assignedAt = minutesAfter(createdAt, 5 + Math.random() * 10);
    const pickedUpAt = minutesAfter(assignedAt, 5 + Math.random() * 10);
    const orderData = buildOrderData(placer.id);
    await prisma.order.create({
      data: {
        ...orderData,
        riderId: rider.id,
        status: 'PICKED_UP',
        createdAt,
        assignedAt,
        pickedUpAt,
        payment: {
          create: { amount: orderData.cost, momoPhone: placer.phone, status: 'SUCCESS', transactionRef: 'MOMO-SEED-P' + i },
        },
      },
    });
    created++;
  }

  // 10 PLACED, paid, unassigned — visible in the rider job list.
  for (let i = 0; i < 10; i++) {
    const placer = pick(placers);
    const createdAt = daysAgo(Math.random() * 0.5);
    const orderData = buildOrderData(placer.id);
    await prisma.order.create({
      data: {
        ...orderData,
        status: 'PLACED',
        createdAt,
        payment: {
          create: { amount: orderData.cost, momoPhone: placer.phone, status: 'SUCCESS', transactionRef: 'MOMO-SEED-J' + i },
        },
      },
    });
    created++;
  }

  // 4 PLACED with a failed payment attempt — customer hasn't successfully paid yet.
  for (let i = 0; i < 4; i++) {
    const placer = pick(placers);
    const orderData = buildOrderData(placer.id);
    await prisma.order.create({
      data: {
        ...orderData,
        status: 'PLACED',
        createdAt: daysAgo(Math.random() * 2),
        payment: {
          create: { amount: orderData.cost, momoPhone: placer.phone, status: 'FAILED', transactionRef: 'MOMO-SEED-F' + i },
        },
      },
    });
    created++;
  }

  // 3 CANCELLED — never assigned a rider, per the cancellation business rule.
  for (let i = 0; i < 3; i++) {
    const placer = pick(placers);
    const createdAt = daysAgo(Math.random() * 10 + 1);
    await prisma.order.create({
      data: {
        ...buildOrderData(placer.id),
        status: 'CANCELLED',
        createdAt,
        cancelledAt: minutesAfter(createdAt, 10),
      },
    });
    created++;
  }

  console.log(`Seed complete: ${created} orders, ${riders.length} riders, ${businesses.length} businesses, ${customers.length} customers.`);
  console.log(`All accounts use password: ${PASSWORD}`);
  console.log('Sample logins — Admin:', (await prisma.user.findFirst({ where: { role: 'ADMIN' } })).phone);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
