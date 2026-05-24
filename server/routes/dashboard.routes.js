const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's sales
    const todaySales = await queryOne(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE sold_at::date = ?::date AND status = 'paid'
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

    // Expiring batches (within 90 days)
    const expiringBatches = await queryOne(`
      SELECT COUNT(*) as count FROM product_batches
      WHERE status = 'active' AND qty_on_hand > 0
        AND expiry_date IS NOT NULL
        AND expiry_date::date <= CURRENT_DATE + INTERVAL '90 days'
        AND expiry_date::date >= CURRENT_DATE
    `);

    // Recent transactions (last 5)
    const recentTransactions = await query(`
      SELECT s.id, s.sale_number, s.customer_name, s.total_amount, s.payment_method, s.sold_at, s.status,
             u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ORDER BY s.sold_at DESC
      LIMIT 5
    `);

    // Sales trend (last 7 days)
    const salesTrend = await query(`
      SELECT sold_at::date::text as date, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE sold_at::date >= CURRENT_DATE - INTERVAL '6 days' AND status = 'paid'
      GROUP BY sold_at::date
      ORDER BY sold_at::date ASC
    `);

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

    // Stock alerts (top 5)
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

    // Expiry alerts (top 5)
    const expiryAlerts = await query(`
      SELECT pb.id, pb.batch_number, pb.expiry_date, pb.qty_on_hand,
             p.name as product_name, p.sku
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND pb.expiry_date::date <= CURRENT_DATE + INTERVAL '90 days'
        AND pb.expiry_date::date >= CURRENT_DATE
      ORDER BY pb.expiry_date ASC
      LIMIT 5
    `);

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
