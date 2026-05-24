const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Today's sales — sold_at is TEXT stored as ISO string, compare with LIKE or LEFT()
    const todaySales = await queryOne(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE LEFT(sold_at, 10) = $1 AND status = 'paid'
    `, [today]);

    // Total active products
    const totalProducts = await queryOne('SELECT COUNT(*) as count FROM products WHERE is_active = 1');

    // Critical stock
    const criticalStock = await queryOne(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id, p.min_stock, COALESCE(SUM(pb.qty_on_hand), 0) as total_qty
        FROM products p
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
        WHERE p.is_active = 1 AND p.min_stock > 0
        GROUP BY p.id, p.min_stock
        HAVING COALESCE(SUM(pb.qty_on_hand), 0) < p.min_stock
      ) sub
    `);

    // Expiring batches (within 90 days) — expiry_date is TEXT 'YYYY-MM-DD'
    const today90 = new Date();
    today90.setDate(today90.getDate() + 90);
    const date90 = today90.toISOString().split('T')[0];

    const expiringBatches = await queryOne(`
      SELECT COUNT(*) as count FROM product_batches
      WHERE status = 'active' AND qty_on_hand > 0
        AND expiry_date IS NOT NULL
        AND expiry_date >= $1
        AND expiry_date <= $2
    `, [today, date90]);

    // Recent transactions (last 5)
    const recentTransactions = await query(`
      SELECT s.id, s.sale_number, s.customer_name, s.total_amount, s.payment_method, s.sold_at, s.status,
             u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ORDER BY s.sold_at DESC
      LIMIT 5
    `);

    // Sales trend (last 7 days) — sold_at is TEXT, use LEFT(sold_at, 10) to get date part
    const date7ago = new Date();
    date7ago.setDate(date7ago.getDate() - 6);
    const dateFrom = date7ago.toISOString().split('T')[0];

    const salesTrend = await query(`
      SELECT LEFT(sold_at, 10) as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE LEFT(sold_at, 10) >= $1 AND status = 'paid'
      GROUP BY LEFT(sold_at, 10)
      ORDER BY LEFT(sold_at, 10) ASC
    `, [dateFrom]);

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

    // Stock alerts (top 5 critical)
    const stockAlerts = await query(`
      SELECT p.id, p.name, p.sku, p.min_stock, COALESCE(SUM(pb.qty_on_hand), 0) as current_stock
      FROM products p
      LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
      WHERE p.is_active = 1 AND p.min_stock > 0
      GROUP BY p.id, p.name, p.sku, p.min_stock
      HAVING COALESCE(SUM(pb.qty_on_hand), 0) < p.min_stock
      ORDER BY (p.min_stock - COALESCE(SUM(pb.qty_on_hand), 0)) DESC
      LIMIT 5
    `);

    // Expiry alerts (top 5) — expiry_date is TEXT 'YYYY-MM-DD'
    const expiryAlerts = await query(`
      SELECT pb.id, pb.batch_number, pb.expiry_date, pb.qty_on_hand,
             p.name as product_name, p.sku
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND pb.expiry_date >= $1
        AND pb.expiry_date <= $2
      ORDER BY pb.expiry_date ASC
      LIMIT 5
    `, [today, date90]);

    res.json({
      todaySales: {
        count: parseInt(todaySales.count) || 0,
        total: parseFloat(todaySales.total) || 0
      },
      totalProducts: parseInt(totalProducts.count) || 0,
      criticalStock: parseInt(criticalStock.count) || 0,
      expiringBatches: parseInt(expiringBatches.count) || 0,
      recentTransactions,
      salesTrend: fullTrend,
      stockAlerts,
      expiryAlerts
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message || 'Gagal memuat data dashboard.' });
  }
});

module.exports = router;
