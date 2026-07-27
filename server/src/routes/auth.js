const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeUser } = require('../utils/serializers');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PHONE_RE = /^0\d{9}$/;
const ALLOWED_SELF_REGISTER_ROLES = ['CUSTOMER', 'RIDER', 'BUSINESS'];

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, phone, password, role, businessName, address, language } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Enter your full name.' });
    }
    const cleanPhone = (phone || '').replace(/\s/g, '');
    if (!PHONE_RE.test(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid phone number, e.g. 0788123456.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const cleanRole = ALLOWED_SELF_REGISTER_ROLES.includes(role) ? role : 'CUSTOMER';
    if (cleanRole === 'BUSINESS' && !businessName?.trim()) {
      return res.status(400).json({ error: 'Business name is required.' });
    }

    const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const authToken = genToken();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        passwordHash,
        role: cleanRole,
        language: language === 'en' ? 'en' : 'rw',
        authToken,
        ...(cleanRole === 'RIDER' ? { riderProfile: { create: {} } } : {}),
        ...(cleanRole === 'BUSINESS'
          ? { businessProfile: { create: { businessName: businessName.trim(), address: address?.trim() || null } } }
          : {}),
      },
      include: { riderProfile: true, businessProfile: true },
    });

    res.status(201).json({ user: sanitizeUser(user), token: authToken });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    const cleanPhone = (phone || '').replace(/\s/g, '');

    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: { riderProfile: true, businessProfile: true },
    });
    if (!user) return res.status(401).json({ error: 'Invalid phone number or password.' });

    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid phone number or password.' });

    const authToken = genToken();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { authToken },
      include: { riderProfile: true, businessProfile: true },
    });

    res.json({ user: sanitizeUser(updated), token: authToken });
  })
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.update({ where: { id: req.user.id }, data: { authToken: null } });
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { riderProfile: true, businessProfile: true },
    });
    res.json({ user: sanitizeUser(user) });
  })
);

module.exports = router;
