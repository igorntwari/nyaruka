require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const riderRoutes = require('./routes/riders');
const adminRoutes = require('./routes/admin');
const businessRoutes = require('./routes/business');
const ussdRoutes = require('./routes/ussd');
const { ZONES } = require('./services/orderService');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/zones', (req, res) => res.json({ zones: ZONES }));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/ussd', ussdRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Nyaruka API listening on :${port}`));
