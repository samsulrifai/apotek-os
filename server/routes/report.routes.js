const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// Helper: compute date string N days from now
function addDays(n) {
  return new Date(Date.now() + n * 86400000).toISOString().split('T')[0];
}

// GET /api/reports/profit-loss
router.get('/profit-loss', verifyToken, async (req, res) => {
  try {
    const { start, end, group_by = 'daily' } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Tanggal awal dan akhir harus diisi.' });

    // sold_at is TEXT stored as ISO string — compare with LEFT(sold_at,10) string comparison
    const revenue = await queryOne(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE status = 'paid' AND LEFT(sold_at, 10) >= $1 AND LEFT(sold_at, 10) <= $2
    `, [start, end]);

    const cogs = await queryOne(`
      SELECT COALESCE(SUM(sib.qty * pb.purchase_price), 0) as total
      FROM sale_item_batches sib
      JOIN sale_items si ON si.id = sib.sale_item_id
      JOIN sales s ON s.id = si.sale_id
      JOIN product_batches pb ON pb.id = sib.product_batch_id
      WHERE s.status = 'paid' AND LEFT(s.sold_at, 10) >= $1 AND LEFT(s.sold_at, 10) <= $2
    `, [start, end]);

    const rev = parseFloat(revenue.total) || 0;
    const cost = parseFloat(cogs.total) || 0;
    const grossProfit = rev - cost;
    const margin = rev > 0 ? ((grossProfit / rev) * 100).toFixed(2) : 0;

    let dateFormat;
    if (group_by === 'monthly') {
      dateFormat = "TO_CHAR(TO_DATE(LEFT(sold_at, 10), 'YYYY-MM-DD'), 'YYYY-MM')";
    } else if (group_by === 'weekly') {
      dateFormat = "TO_CHAR(TO_DATE(LEFT(sold_at, 10), 'YYYY-MM-DD'), 'IYYY-\"W\"IW')";
    } else {
      dateFormat = "LEFT(sold_at, 10)";
    }

    const breakdown = await query(`
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
      WHERE s.status = 'paid' AND LEFT(s.sold_at, 10) >= $1 AND LEFT(s.sold_at, 10) <= $2
      GROUP BY period
      ORDER BY period ASC
    `, [start, end]);

    res.json({
      summary: {
        revenue: rev,
        cogs: cost,
        grossProfit,
        margin: parseFloat(margin)
      },
      breakdown: breakdown.map(b => ({
        ...b,
        revenue: parseFloat(b.revenue) || 0,
        cogs: parseFloat(b.cogs) || 0,
        grossProfit: (parseFloat(b.revenue) || 0) - (parseFloat(b.cogs) || 0)
      }))
    });
  } catch (err) {
    console.error('Profit-loss report error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat laporan laba rugi.' });
  }
});

// GET /api/reports/sales
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Tanggal awal dan akhir harus diisi.' });

    const summary = await queryOne(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total,
             COALESCE(AVG(total_amount), 0) as average
      FROM sales
      WHERE status = 'paid' AND LEFT(sold_at, 10) >= $1 AND LEFT(sold_at, 10) <= $2
    `, [start, end]);

    const byCategory = await query(`
      SELECT c.name as category, COUNT(DISTINCT s.id) as sale_count,
             COALESCE(SUM(si.subtotal), 0) as total
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE s.status = 'paid' AND LEFT(s.sold_at, 10) >= $1 AND LEFT(s.sold_at, 10) <= $2
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `, [start, end]);

    const byPaymentMethod = await query(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales
      WHERE status = 'paid' AND LEFT(sold_at, 10) >= $1 AND LEFT(sold_at, 10) <= $2
      GROUP BY payment_method
    `, [start, end]);

    const topProducts = await query(`
      SELECT si.product_name, si.product_id, SUM(si.qty) as total_qty,
             COALESCE(SUM(si.subtotal), 0) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'paid' AND LEFT(s.sold_at, 10) >= $1 AND LEFT(s.sold_at, 10) <= $2
      GROUP BY si.product_id, si.product_name
      ORDER BY total_qty DESC
      LIMIT 10
    `, [start, end]);

    res.json({
      summary: {
        total: parseFloat(summary.total) || 0,
        count: parseInt(summary.count) || 0,
        average: Math.round(parseFloat(summary.average) || 0)
      },
      byCategory,
      byPaymentMethod,
      topProducts
    });
  } catch (err) {
    console.error('Sales report error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat laporan penjualan.' });
  }
});

// GET /api/reports/expiries
router.get('/expiries', verifyToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = addDays(days);

    const expiring = await query(`
      SELECT pb.id, pb.batch_number, pb.expiry_date, pb.qty_on_hand, pb.purchase_price,
             p.id as product_id, p.name as product_name, p.sku, p.generic_name, p.selling_price,
             c.name as category_name, u.name as unit_name,
             (TO_DATE(pb.expiry_date, 'YYYY-MM-DD') - CURRENT_DATE) as days_until_expiry
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND pb.expiry_date >= $1
        AND pb.expiry_date <= $2
        AND p.is_active = 1
      ORDER BY pb.expiry_date ASC
    `, [todayStr, maxDate]);

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
    res.status(500).json({ error: err.message || 'Gagal membuat laporan kadaluarsa.' });
  }
});

module.exports = router;
