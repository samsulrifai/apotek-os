const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./db/database');
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

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/goods-receipts', (req, res, next) => {
  // Forward to purchase routes which handles /goods-receipts
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
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
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
