const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/inventory/stock — products with total stock
router.get('/stock', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { search, category_id, stock_status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['p.is_active = 1'];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let havingClause = '';
    if (stock_status === 'low') {
      havingClause = 'HAVING total_stock < p.min_stock AND p.min_stock > 0';
    } else if (stock_status === 'out') {
      havingClause = 'HAVING total_stock = 0';
    } else if (stock_status === 'normal') {
      havingClause = 'HAVING total_stock >= p.min_stock OR p.min_stock = 0';
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id, COALESCE(SUM(pb.qty_on_hand), 0) as total_stock
        FROM products p
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
        ${whereClause}
        GROUP BY p.id
        ${havingClause}
      )
    `).get(...params);

    const items = db.prepare(`
      SELECT p.id as product_id, p.sku, p.name as product_name, p.generic_name, 
             p.min_stock, p.selling_price, p.default_purchase_price, p.drug_class, p.manufacturer,
             c.name as category_name, u.name as unit_name, u.symbol as unit_symbol,
             COALESCE(SUM(pb.qty_on_hand), 0) as total_stock,
             COUNT(pb.id) as batch_count
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
      ${whereClause}
      GROUP BY p.id
      ${havingClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    // Enrich each item with status and batches
    const enriched = items.map(item => {
      let status = 'normal';
      if (item.total_stock === 0) status = 'empty';
      else if (item.min_stock > 0 && item.total_stock <= item.min_stock) status = 'critical';
      else if (item.min_stock > 0 && item.total_stock <= item.min_stock * 1.5) status = 'low';

      // Get batches for this product
      const batches = db.prepare(`
        SELECT id, batch_number, expiry_date, qty_on_hand, purchase_price, manufacture_date, status
        FROM product_batches
        WHERE product_id = ? AND status = 'active' AND qty_on_hand > 0
        ORDER BY expiry_date ASC
      `).all(item.product_id);

      return {
        ...item,
        unit_symbol: item.unit_symbol || item.unit_name || '-',
        status,
        batches
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Inventory stock error:', err);
    res.status(500).json({ error: 'Gagal memuat data stok.' });
  }
});

// GET /api/inventory/stats
router.get('/stats', verifyToken, (req, res) => {
  try {
    const db = getDb();

    const totalItems = db.prepare(`
      SELECT COALESCE(SUM(pb.qty_on_hand), 0) as count
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND p.is_active = 1
    `).get();

    const totalValue = db.prepare(`
      SELECT COALESCE(SUM(pb.qty_on_hand * pb.purchase_price), 0) as value
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND p.is_active = 1
    `).get();

    const criticalStock = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id FROM products p
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
        WHERE p.is_active = 1 AND p.min_stock > 0
        GROUP BY p.id
        HAVING COALESCE(SUM(pb.qty_on_hand), 0) < p.min_stock
      )
    `).get();

    const expiringCount = db.prepare(`
      SELECT COUNT(*) as count FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND DATE(pb.expiry_date) <= DATE('now', '+90 days')
        AND DATE(pb.expiry_date) >= DATE('now')
        AND p.is_active = 1
    `).get();

    res.json({
      totalItems: totalItems.count,
      inventoryValue: totalValue.value,
      criticalStock: criticalStock.count,
      expiringBatches: expiringCount.count
    });
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Gagal memuat statistik inventaris.' });
  }
});

// GET /api/inventory/expiring
router.get('/expiring', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const days = parseInt(req.query.days) || 90;

    const batches = db.prepare(`
      SELECT pb.*, p.name as product_name, p.sku, p.generic_name,
             u.name as unit_name
      FROM product_batches pb
      JOIN products p ON p.id = pb.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE pb.status = 'active' AND pb.qty_on_hand > 0
        AND pb.expiry_date IS NOT NULL
        AND DATE(pb.expiry_date) <= DATE('now', '+' || ? || ' days')
        AND DATE(pb.expiry_date) >= DATE('now')
        AND p.is_active = 1
      ORDER BY pb.expiry_date ASC
    `).all(days);

    res.json(batches);
  } catch (err) {
    console.error('Expiring batches error:', err);
    res.status(500).json({ error: 'Gagal memuat data batch kadaluarsa.' });
  }
});

// POST /api/inventory/adjust
router.post('/adjust', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { reason, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items penyesuaian harus diisi.' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Alasan penyesuaian harus diisi.' });
    }

    const adjustmentId = uuidv4();
    const now = new Date().toISOString();

    // Generate adjustment number
    const count = db.prepare('SELECT COUNT(*) as count FROM stock_adjustments').get();
    const adjNumber = `ADJ-${now.split('T')[0].replace(/-/g, '')}-${String(count.count + 1).padStart(4, '0')}`;

    const insertAdjustment = db.prepare(`
      INSERT INTO stock_adjustments (id, adjustment_number, reason, notes, status, created_by, created_at)
      VALUES (?, ?, ?, ?, 'completed', ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO stock_adjustment_items (id, stock_adjustment_id, product_id, product_batch_id, qty_before, qty_after, qty_difference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateBatch = db.prepare('UPDATE product_batches SET qty_on_hand = ?, updated_at = ? WHERE id = ?');

    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertAdjustment.run(adjustmentId, adjNumber, reason, notes || null, req.user.id, now);

      for (const item of items) {
        const { product_id, qty_after } = item;
        let { product_batch_id } = item;

        if (!product_id || qty_after === undefined) {
          throw new Error('product_id dan qty_after harus diisi untuk setiap item.');
        }

        // Get all active batches for this product (FEFO order)
        const allBatches = db.prepare(
          'SELECT * FROM product_batches WHERE product_id = ? AND status = ? ORDER BY expiry_date ASC'
        ).all(product_id, 'active');

        // Calculate total current stock
        const totalCurrentStock = allBatches.reduce((sum, b) => sum + (b.qty_on_hand || 0), 0);
        const qtyBefore = totalCurrentStock;
        const qtyDiff = qty_after - qtyBefore;

        // Record the adjustment item
        const primaryBatch = allBatches.length > 0 ? allBatches[0] : null;
        const itemId = uuidv4();
        insertItem.run(itemId, adjustmentId, product_id, product_batch_id || (primaryBatch ? primaryBatch.id : null), qtyBefore, qty_after, qtyDiff);

        // Distribute the change across batches
        if (product_batch_id) {
          // Specific batch targeted — only update that batch
          const batch = db.prepare('SELECT * FROM product_batches WHERE id = ?').get(product_batch_id);
          if (batch) {
            const newQty = Math.max(0, batch.qty_on_hand + qtyDiff);
            updateBatch.run(newQty, now, product_batch_id);
          }
        } else if (allBatches.length > 0) {
          if (qtyDiff <= 0) {
            // DECREASE: drain batches FEFO until we've removed enough
            let remaining = Math.abs(qtyDiff);
            for (const b of allBatches) {
              if (remaining <= 0) break;
              const drain = Math.min(b.qty_on_hand, remaining);
              updateBatch.run(b.qty_on_hand - drain, now, b.id);
              remaining -= drain;
            }
            product_batch_id = allBatches[0].id;
          } else {
            // INCREASE: add to the last batch (most recent)
            const lastBatch = allBatches[allBatches.length - 1];
            updateBatch.run(lastBatch.qty_on_hand + qtyDiff, now, lastBatch.id);
            product_batch_id = lastBatch.id;
          }
        }

        // Create stock movement
        const movementId = uuidv4();
        const qtyIn = qtyDiff > 0 ? qtyDiff : 0;
        const qtyOut = qtyDiff < 0 ? Math.abs(qtyDiff) : 0;

        insertMovement.run(
          movementId, product_id, product_batch_id || null,
          'adjustment', 'stock_adjustment', adjustmentId,
          qtyIn, qtyOut,
          primaryBatch ? primaryBatch.purchase_price : 0,
          `Penyesuaian stok: ${reason}`,
          req.user.id, now
        );
      }
    });

    transaction();
    db._save();

    res.status(201).json({
      id: adjustmentId,
      adjustment_number: adjNumber,
      message: 'Penyesuaian stok berhasil.'
    });
    logAudit(req.user?.id, 'create_adjustment', 'stock_adjustment', adjustmentId, { adjustment_number: adjNumber, reason });
  } catch (err) {
    console.error('Stock adjustment error:', err);
    res.status(500).json({ error: err.message || 'Gagal melakukan penyesuaian stok.' });
  }
});

// GET /api/inventory/adjustments — list all stock adjustments
router.get('/adjustments', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const adjustments = db.prepare(`
      SELECT sa.*, u.full_name as created_by_name
      FROM stock_adjustments sa
      LEFT JOIN users u ON u.id = sa.created_by
      ORDER BY sa.created_at DESC
    `).all();
    res.json(adjustments);
  } catch (err) {
    console.error('List adjustments error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar penyesuaian stok.' });
  }
});

// GET /api/inventory/adjustments/:id — detail with items
router.get('/adjustments/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const adj = db.prepare(`
      SELECT sa.*, u.full_name as created_by_name
      FROM stock_adjustments sa
      LEFT JOIN users u ON u.id = sa.created_by
      WHERE sa.id = ?
    `).get(req.params.id);

    if (!adj) {
      return res.status(404).json({ error: 'Penyesuaian stok tidak ditemukan.' });
    }

    const items = db.prepare(`
      SELECT sai.*, p.name as product_name, p.sku, pb.batch_number
      FROM stock_adjustment_items sai
      LEFT JOIN products p ON p.id = sai.product_id
      LEFT JOIN product_batches pb ON pb.id = sai.product_batch_id
      WHERE sai.stock_adjustment_id = ?
    `).all(req.params.id);

    res.json({ ...adj, items });
  } catch (err) {
    console.error('Get adjustment detail error:', err);
    res.status(500).json({ error: 'Gagal memuat detail penyesuaian stok.' });
  }
});

module.exports = router;
