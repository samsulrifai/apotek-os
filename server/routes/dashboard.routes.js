const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Today's sales
    const todaySales = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE DATE(sold_at) = ? AND status = 'paid'
    `).get(today);

    // Total active products
    const totalProducts = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1
    `).get();

    // Critical stock: products where total batch qty < min_stock
    const criticalStock = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id, p.min_stock, COALESCE(SUM(pb.qty_on_hand), 0) as total_qty
        FROM products p
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
        WHERE p.is_active = 1 AND p.min_stock > 0
        GROUP BY p.id
        HAVING total_qty < p.min_stock
      )
    `).get();

    // Expiring batches (within 90 days)
    const expiringBatches = db.prepare(`
      SELECT COUNT(*) as count FROM product_batches
      WHERE status = 'active' AND qty_on_hand > 0
        AND expiry_date IS NOT NULL
        AND DATE(expiry_date) <= DATE('now', '+90 days')
        AND DATE(expiry_date) >= DATE('now')
    `).get();

    // Recent transactions (last 5)
    const recentTransactions = db.prepare(`
      SELECT s.id, s.sale_number, s.customer_name, s.total_amount, s.payment_method, s.sold_at, s.status,
             u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ORDER BY s.sold_at DESC
      LIMIT 5
    `).all();

    // Sales trend (last 7 days)
    const salesTrend = db.prepare(`
      SELECT DATE(sold_at) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE DATE(sold_at) >= DATE('now', '-6 days') AND status = 'paid'
      GROUP BY DATE(sold_at)
      ORDER BY date ASC
    `).all();

    // Fill missing days in trend
    const trendMap = {};
    salesTrend.forEach(s => { trendMap[s.date] = s; });
    const fullTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      fullTrend.push(trendMap[dateStr] || { date: dateStr, count: 0, total: 0 });
    }

    // Stock alerts (products below min_stock, top 5)
    const stockAlerts = db.prepare(`
      SELECT p.id, p.name, p.sku, p.min_stock, COALESCE(SUM(pb.qty_on_hand), 0) as current_stock
      FROM products p
      LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
      WHERE p.is_active = 1 AND p.min_stock > 0
      GROUP BY p.id
      HAVING current_stock < p.min_stock
      ORDER BY (p.min_stock - current_stock) DESC
      LIMIT 5
    `).all();

    // Expiry alerts (batches expiring within 90 days, top 5)
    const expiryAlerts = db.prepare(`
      SELECT pb.id, pb.batch_number, pb.expiry_date, pb.qty_on_hand,
             p.name as product_name, p.sku
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND DATE(pb.expiry_date) <= DATE('now', '+90 days')
        AND DATE(pb.expiry_date) >= DATE('now')
      ORDER BY pb.expiry_date ASC
      LIMIT 5
    `).all();

    res.json({
      todaySales: { count: todaySales.count, total: todaySales.total },
      totalProducts: totalProducts.count,
      criticalStock: criticalStock.count,
      expiringBatches: expiringBatches.count,
      recentTransactions,
      salesTrend: fullTrend,
      stockAlerts,
      expiryAlerts
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Gagal memuat data dashboard.' });
  }
});

module.exports = router;
