const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/purchase-orders
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { status, supplier_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('po.status = ?');
      params.push(status);
    }
    if (supplier_id) {
      conditions.push('po.supplier_id = ?');
      params.push(supplier_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) as count FROM purchase_orders po ${whereClause}`).get(...params);

    const orders = db.prepare(`
      SELECT po.*, s.name as supplier_name, u.full_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        totalPages: Math.ceil(total.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List POs error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar PO.' });
  }
});

// POST /api/purchase-orders
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { supplier_id, order_date, expected_date, notes, items } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ error: 'Supplier harus dipilih.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal satu item harus diisi.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Generate PO number
    const count = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get();
    const poNumber = `PO-${now.split('T')[0].replace(/-/g, '')}-${String(count.count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = items.map(item => {
      const itemSubtotal = (item.qty_ordered || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || 0;
      const itemTax = item.tax_amount || 0;
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;

      return {
        id: uuidv4(),
        purchase_order_id: id,
        product_id: item.product_id,
        qty_ordered: item.qty_ordered || 0,
        qty_received: 0,
        unit_price: item.unit_price || 0,
        discount_amount: itemDiscount,
        tax_amount: itemTax,
        subtotal: itemSubtotal - itemDiscount + itemTax
      };
    });

    const totalAmount = subtotal - totalDiscount + totalTax;

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchase_orders (id, supplier_id, po_number, order_date, expected_date, status, subtotal, discount_amount, tax_amount, total_amount, notes, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, supplier_id, poNumber, order_date || now, expected_date || null, subtotal, totalDiscount, totalTax, totalAmount, notes || null, req.user.id, now, now);

      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (id, purchase_order_id, product_id, qty_ordered, qty_received, unit_price, discount_amount, tax_amount, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        insertItem.run(item.id, item.purchase_order_id, item.product_id, item.qty_ordered, item.qty_received, item.unit_price, item.discount_amount, item.tax_amount, item.subtotal);
      }
    });

    transaction();

    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    res.status(201).json(po);
  } catch (err) {
    console.error('Create PO error:', err);
    res.status(500).json({ error: 'Gagal membuat Purchase Order.' });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name, u.full_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = ?
    `).get(req.params.id);

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });
    }

    const items = db.prepare(`
      SELECT poi.*, p.name as product_name, p.sku
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
    `).all(req.params.id);

    res.json({ ...po, items });
  } catch (err) {
    console.error('Get PO error:', err);
    res.status(500).json({ error: 'Gagal memuat detail PO.' });
  }
});

// PUT /api/purchase-orders/:id
router.put('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Hanya PO berstatus draft yang bisa diubah.' });
    }

    const { supplier_id, order_date, expected_date, notes, items } = req.body;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      if (items && Array.isArray(items)) {
        // Delete old items and reinsert
        db.prepare('DELETE FROM purchase_order_items WHERE purchase_order_id = ?').run(req.params.id);

        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        const insertItem = db.prepare(`
          INSERT INTO purchase_order_items (id, purchase_order_id, product_id, qty_ordered, qty_received, unit_price, discount_amount, tax_amount, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          const itemSubtotal = (item.qty_ordered || 0) * (item.unit_price || 0);
          const itemDiscount = item.discount_amount || 0;
          const itemTax = item.tax_amount || 0;
          subtotal += itemSubtotal;
          totalDiscount += itemDiscount;
          totalTax += itemTax;

          insertItem.run(uuidv4(), req.params.id, item.product_id, item.qty_ordered || 0, 0, item.unit_price || 0, itemDiscount, itemTax, itemSubtotal - itemDiscount + itemTax);
        }

        const totalAmount = subtotal - totalDiscount + totalTax;

        db.prepare(`
          UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, notes = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, updated_at = ?
          WHERE id = ?
        `).run(supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date, notes !== undefined ? notes : existing.notes, subtotal, totalDiscount, totalTax, totalAmount, now, req.params.id);
      } else {
        db.prepare(`
          UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, notes = ?, updated_at = ?
          WHERE id = ?
        `).run(supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date, notes !== undefined ? notes : existing.notes, now, req.params.id);
      }
    });

    transaction();

    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    res.json(po);
  } catch (err) {
    console.error('Update PO error:', err);
    res.status(500).json({ error: 'Gagal mengupdate PO.' });
  }
});

// PUT /api/purchase-orders/:id/status
router.put('/:id/status', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });
    }

    const { status } = req.body;
    const validStatuses = ['draft', 'approved', 'ordered', 'partial', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status tidak valid. Gunakan: ${validStatuses.join(', ')}` });
    }

    db.prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), req.params.id);

    res.json({ message: 'Status PO berhasil diubah.', status });
  } catch (err) {
    console.error('Update PO status error:', err);
    res.status(500).json({ error: 'Gagal mengubah status PO.' });
  }
});

// POST /api/goods-receipts
router.post('/goods-receipts', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { purchase_order_id, received_date, notes, items } = req.body;

    if (!purchase_order_id) {
      return res.status(400).json({ error: 'Purchase Order harus dipilih.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal satu item harus diisi.' });
    }

    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(purchase_order_id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const count = db.prepare('SELECT COUNT(*) as count FROM goods_receipts').get();
    const receiptNumber = `GR-${now.split('T')[0].replace(/-/g, '')}-${String(count.count + 1).padStart(4, '0')}`;

    const transaction = db.transaction(() => {
      // Create goods receipt
      db.prepare(`
        INSERT INTO goods_receipts (id, purchase_order_id, receipt_number, received_date, received_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, purchase_order_id, receiptNumber, received_date || now, req.user.id, notes || null, now);

      const insertGrItem = db.prepare(`
        INSERT INTO goods_receipt_items (id, goods_receipt_id, product_id, product_batch_id, qty_received, unit_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const upsertBatch = db.prepare(`
        INSERT INTO product_batches (id, product_id, batch_number, manufacture_date, expiry_date, purchase_price, qty_on_hand, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(product_id, batch_number) DO UPDATE SET
          qty_on_hand = qty_on_hand + ?,
          purchase_price = ?,
          updated_at = ?
      `);

      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at)
        VALUES (?, ?, ?, 'in', 'goods_receipt', ?, ?, 0, ?, ?, ?, ?)
      `);

      const updatePoItem = db.prepare(`
        UPDATE purchase_order_items SET qty_received = qty_received + ?
        WHERE purchase_order_id = ? AND product_id = ?
      `);

      for (const item of items) {
        const { product_id, batch_number, manufacture_date, expiry_date, qty_received, unit_price } = item;

        if (!product_id || !batch_number || !qty_received) {
          throw new Error('product_id, batch_number, dan qty_received harus diisi.');
        }

        // Check if batch exists
        let batchId;
        const existingBatch = db.prepare('SELECT id FROM product_batches WHERE product_id = ? AND batch_number = ?').get(product_id, batch_number);

        if (existingBatch) {
          batchId = existingBatch.id;
        } else {
          batchId = uuidv4();
        }

        // Upsert batch
        upsertBatch.run(
          batchId, product_id, batch_number,
          manufacture_date || null, expiry_date || null,
          unit_price || 0, qty_received, now, now,
          qty_received, unit_price || 0, now
        );

        // Create GR item
        insertGrItem.run(uuidv4(), id, product_id, batchId, qty_received, unit_price || 0);

        // Create stock movement
        insertMovement.run(uuidv4(), product_id, batchId, id, qty_received, unit_price || 0, `Penerimaan barang: ${receiptNumber}`, req.user.id, now);

        // Update PO item qty_received
        updatePoItem.run(qty_received, purchase_order_id, product_id);
      }

      // Check if PO is fully received
      const poItems = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(purchase_order_id);
      const allReceived = poItems.every(item => item.qty_received >= item.qty_ordered);
      const someReceived = poItems.some(item => item.qty_received > 0);

      if (allReceived) {
        db.prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?').run('completed', now, purchase_order_id);
      } else if (someReceived) {
        db.prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?').run('partial', now, purchase_order_id);
      }
    });

    transaction();

    const gr = db.prepare('SELECT * FROM goods_receipts WHERE id = ?').get(id);
    res.status(201).json(gr);
  } catch (err) {
    console.error('Create GR error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat penerimaan barang.' });
  }
});

// GET /api/goods-receipts
router.get('/goods-receipts', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const receipts = db.prepare(`
      SELECT gr.*, po.po_number, s.name as supplier_name, u.full_name as received_by_name
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = gr.received_by
      ORDER BY gr.created_at DESC
    `).all();

    res.json(receipts);
  } catch (err) {
    console.error('List GR error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar penerimaan barang.' });
  }
});

// GET /api/invoices — list purchase invoices
router.get('/invoices', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const invoices = db.prepare(`
      SELECT po.id, po.po_number, po.order_date, po.status, po.total_amount,
             s.name as supplier_name,
             gr.receipt_number, gr.received_date
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id
      WHERE po.status IN ('completed', 'partial')
      ORDER BY po.created_at DESC
    `).all();

    res.json(invoices);
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar faktur.' });
  }
});

// GET /api/invoices/stats
router.get('/invoices/stats', verifyToken, (req, res) => {
  try {
    const db = getDb();

    const totalPayable = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM purchase_orders WHERE status IN ('completed', 'partial', 'approved', 'ordered')
    `).get();

    const paid = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM purchase_orders WHERE status = 'completed'
    `).get();

    const unpaid = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM purchase_orders WHERE status IN ('partial', 'approved', 'ordered')
    `).get();

    res.json({
      totalPayable: totalPayable.total,
      overdue: 0,
      paid: paid.total,
      unpaid: unpaid.total
    });
  } catch (err) {
    console.error('Invoice stats error:', err);
    res.status(500).json({ error: 'Gagal memuat statistik faktur.' });
  }
});

module.exports = router;
