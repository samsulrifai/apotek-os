require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

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

// ─── CORS ──────────────────────────────────────────────────────────────────
// In production (Vercel) allow all origins because the frontend is served
// from the same Vercel domain and requests go to /api/* on the same origin.
// The wildcard is safe here because the API is protected by JWT anyway.
const corsOptions = process.env.ALLOWED_ORIGINS
  ? {
      origin: process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
      credentials: true,
    }
  : {
      origin: true, // reflect the request origin (allows all)
      credentials: true,
    };

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── API Routes ────────────────────────────────────────────────────────────
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
// In Vercel (serverless), this block is skipped; the module.exports below is used.
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
        console.log(`  API     : http://localhost:${PORT}/api`);
        console.log(`  Frontend: http://localhost:5173`);
        console.log('============================================');
      });
    })
    .catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = app;
