require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// Validate required environment variables at startup
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Set them in Vercel → Settings → Environment Variables');
  // In serverless (Vercel) we cannot process.exit — instead throw so the
  // first request gets a 500 with a clear message rather than a silent hang.
  if (require.main === module) process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const supplierRoutes = require('./routes/supplier.routes');
const unitRoutes = require('./routes/unit.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const salesRoutes = require('./routes/sales.routes');
const reportRoutes = require('./routes/report.routes');
const settingsRoutes = require('./routes/settings.routes');
const userRoutes = require('./routes/user.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─── Security Headers (Helmet) ─────────────────────────────────────────────
app.use(helmet({
  // Loosen CSP for Vite's inline styles/scripts when serving from same origin
  contentSecurityPolicy: false,
}));

// ─── CORS ──────────────────────────────────────────────────────────────────
const corsOptions = process.env.ALLOWED_ORIGINS
  ? { origin: process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()), credentials: true }
  : { origin: true, credentials: true };
app.use(cors(corsOptions));

// ─── Body Parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Global API Rate Limiter ───────────────────────────────────────────────
// Prevents abuse of any API endpoint
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // max 500 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa menit.' },
});
app.use('/api', globalLimiter);

// ─── Strict Login Rate Limiter ─────────────────────────────────────────────
// Prevents brute-force on login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
  skipSuccessfulRequests: true, // don't count successful logins
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginLimiter);   // apply login limiter first
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/goods-receipts', (req, res, next) => {
  req.url = '/goods-receipts' + req.url;
  purchaseRoutes(req, res, next);
});
app.use('/api/invoices', (req, res, next) => {
  req.url = '/invoices' + req.url;
  purchaseRoutes(req, res, next);
});
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check — also tests DB connection
app.get('/api/health', async (req, res) => {
  try {
    const { query } = require('./db/database');
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// Error handler
app.use(errorHandler);

// ─── Local dev: listen on port ─────────────────────────────────────────────
if (require.main === module) {
  const { initializeDatabase } = require('./db/database');
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log('============================================');
        console.log('  Apotek Web Server');
        console.log('============================================');
        console.log(`  Status  : Running`);
        console.log(`  Port    : ${PORT}`);
        console.log(`  Env     : ${isProd ? 'production' : 'development'}`);
        console.log(`  API     : http://localhost:${PORT}/api`);
        console.log('============================================');
      });
    })
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = app;
