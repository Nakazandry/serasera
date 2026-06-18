const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const messageRoutes = require('./routes/message.routes');
const ratingRoutes = require('./routes/rating.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');
const errorHandler = require('./middleware/error.middleware');

const app = express();

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedDevOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const { hostname, protocol } = new URL(origin);
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
    const isPrivateLan = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);

    return isHttp && (isLocalHost || isPrivateLan);
  } catch {
    return false;
  }
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    if (configuredOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origine CORS non autorisee: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Sera-Sera' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

module.exports = app;
