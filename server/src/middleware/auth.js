const { prisma } = require('../db');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token.' });

  const user = await prisma.user.findUnique({ where: { authToken: token } });
  if (!user) return res.status(401).json({ error: 'Invalid or expired session.' });

  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not allowed for this account type.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
