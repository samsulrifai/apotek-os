const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/reports/profit-loss
router.get('/profit-loss', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { start, end, group_by = 'daily' } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Tanggal awal dan akhir harus diisi.' });
    }

    // Revenue: sum of paid sales
    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE status = 'paid' AND DATE(sold_at) >= ? AND DATE(sold_at) <= ?
    `).get(start, end);

    // COGS: sum of (batch purchase_price * qty allocated)
    const cogs = db.prepare(`
      SELECT COALESCE(SUM(sib.qty * pb.purchase_price), 0) as total
      FROM sale_item_batches sib
      JOIN sale_items si ON si.id = sib.sale_item_id
      JOIN sales s ON s.id = si.sale_id
      JOIN product_batches pb ON pb.id = sib.product_batch_id
      WHERE s.status = 'paid' AND DATE(s.sold_at) >= ? AND DATE(s.sold_at) <= ?
    `).get(start, end);

    const grossProfit = revenue.total - cogs.total;
    const margin = revenue.total > 0 ? ((grossProfit / revenue.total) * 100).toFixed(2) : 0;

    // Breakdown by period
    let dateFormat;
    if (group_by === 'monthly') {
      dateFormat = "strftime('%Y-%m', sold_at)";
    } else if (group_by === 'weekly') {
      dateFormat = "strftime('%Y-W%W', sold_at)";
    } else {
      dateFormat = 'DATE(sold_at)';
    }

    const breakdown = db.prepare(`
      SELECT ${dateFormat} as period,
             COALESCE(SUM(s.total_amount), 0) as revenue,
             COALESCE(SUM(cogs_sub.cogs), 0) as cogs
      FROM sales s
      LEFT JOIN (
        SELECT si.sale_id, SUM(sib.qty * pb.purchase_price) as cogs
        FROM sale_item_batches sib
        JOIN sale_items si ON si.id = sib.sale_item_id
        JOIN product_batches pb ON pb.id = sib.product_batch_id
        GROUP BY si.sale_id
      ) cogs_sub ON cogs_sub.sale_id = s.id
      WHERE s.status = 'paid' AND DATE(s.sold_at) >= ? AND DATE(s.sold_at) <= ?
      GROUP BY period
      ORDER BY period ASC
    `).all(start, end);

    res.json({
      summary: {
        revenue: revenue.total,
        cogs: cogs.total,
        grossProfit,
        margin: parseFloat(margin)
      },
      breakdown: breakdown.map(b => ({
        ...b,
        grossProfit: b.revenue - b.cogs
      }))
    });
  } catch (err) {
    console.error('Profit-loss report error:', err);
    res.status(500).json({ error: 'Gagal membuat laporan laba rugi.' });
  }
});

// GET /api/reports/sales
router.get('/sales', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Tanggal awal dan akhir harus diisi.' });
    }

    const summary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total,
             COALESCE(AVG(total_amount), 0) as average
      FROM sales
      WHERE status = 'paid' AND DATE(sold_at) >= ? AND DATE(sold_at) <= ?
    `).get(start, end);

    const byCategory = db.prepare(`
      SELECT c.name as category, COUNT(DISTINCT s.id) as sale_count,
             COALESCE(SUM(si.subtotal), 0) as total
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE s.status = 'paid' AND DATE(s.sold_at) >= ? AND DATE(s.sold_at) <= ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(start, end);

    const byPaymentMethod = db.prepare(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE status = 'paid' AND DATE(sold_at) >= ? AND DATE(sold_at) <= ?
      GROUP BY payment_method
    `).all(start, end);

    const topProducts = db.prepare(`
      SELECT si.product_name, si.product_id, SUM(si.qty) as total_qty,
             COALESCE(SUM(si.subtotal), 0) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'paid' AND DATE(s.sold_at) >= ? AND DATE(s.sold_at) <= ?
      GROUP BY si.product_id
      ORDER BY total_qty DESC
      LIMIT 10
    `).all(start, end);

    res.json({
      summary: {
        total: summary.total,
        count: summary.count,
        average: Math.round(summary.average)
      },
      byCategory,
      byPaymentMethod,
      topProducts
    });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: 'Gagal membuat laporan penjualan.' });
  }
});

// GET /api/reports/expiries
router.get('/expiries', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days) || 90;

    const expiring = db.prepare(`
      SELECT pb.id, pb.batch_number, pb.expiry_date, pb.qty_on_hand, pb.purchase_price,
             p.id as product_id, p.name as product_name, p.sku, p.generic_name, p.selling_price,
             c.name as category_name, u.name as unit_name,
             CAST(julianday(pb.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND DATE(pb.expiry_date) <= DATE('now', '+' || ? || ' days')
        AND p.is_active = 1
      ORDER BY pb.expiry_date ASC
    `).all(days);

    const totalValue = expiring.reduce((sum, b) => sum + (b.qty_on_hand * b.purchase_price), 0);

    res.json({
      items: expiring,
      summary: {
        count: expiring.length,
        totalValue,
        totalQty: expiring.reduce((sum, b) => sum + b.qty_on_hand, 0)
      }
    });
  } catch (err) {
    console.error('Expiry report error:', err);
    res.status(500).json({ error: 'Gagal membuat laporan kadaluarsa.' });
  }
});

module.exports = router;
