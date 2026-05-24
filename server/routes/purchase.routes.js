const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute, getPool, convertParams } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/purchase-orders
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, supplier_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (status) { conditions.push('po.status = ?'); params.push(status); }
    if (supplier_id) { conditions.push('po.supplier_id = ?'); params.push(supplier_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = await queryOne(`SELECT COUNT(*) as count FROM purchase_orders po ${whereClause}`, params);

    const orders = await query(`
      SELECT po.*, s.name as supplier_name, u.full_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

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

// ============================================================
// GOODS RECEIPTS routes — MUST be before /:id to avoid conflicts
// ============================================================

// GET /api/goods-receipts
router.get('/goods-receipts', verifyToken, async (req, res) => {
  try {
    const receipts = await query(`
      SELECT gr.*, po.po_number, s.name as supplier_name, u.full_name as received_by_name
      FROM goods_receipts gr
      LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = gr.received_by
      ORDER BY gr.created_at DESC
    `);
    res.json(receipts);
  } catch (err) {
    console.error('List GR error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar penerimaan barang.' });
  }
});

// POST /api/goods-receipts
router.post('/goods-receipts', verifyToken, async (req, res) => {
  try {
    const { purchase_order_id, received_date, notes, items } = req.body;
    if (!purchase_order_id) return res.status(400).json({ error: 'Purchase Order harus dipilih.' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Minimal satu item harus diisi.' });

    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [purchase_order_id]);
    if (!po) return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });

    const id = uuidv4();
    const now = new Date().toISOString();

    const count = await queryOne('SELECT COUNT(*) as count FROM goods_receipts');
    const receiptNumber = `GR-${now.split('T')[0].replace(/-/g, '')}-${String(Number(count.count) + 1).padStart(4, '0')}`;

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      await client.query(convertParams(`
        INSERT INTO goods_receipts (id, purchase_order_id, receipt_number, received_date, received_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `), [id, purchase_order_id, receiptNumber, received_date || now, req.user.id, notes || null, now]);

      for (const item of items) {
        const { product_id, batch_number, manufacture_date, expiry_date, qty_received, unit_price } = item;
        if (!product_id || !batch_number || !qty_received) throw new Error('product_id, batch_number, dan qty_received harus diisi.');

        // Check if batch exists
        const { rows: existingBatchRows } = await client.query(convertParams('SELECT id FROM product_batches WHERE product_id = ? AND batch_number = ?'), [product_id, batch_number]);
        let batchId;
        if (existingBatchRows[0]) {
          batchId = existingBatchRows[0].id;
          // Update existing batch
          await client.query(convertParams('UPDATE product_batches SET qty_on_hand = qty_on_hand + ?, purchase_price = ?, updated_at = ? WHERE id = ?'),
            [qty_received, unit_price || 0, now, batchId]);
        } else {
          batchId = uuidv4();
          await client.query(convertParams(`
            INSERT INTO product_batches (id, product_id, batch_number, manufacture_date, expiry_date, purchase_price, qty_on_hand, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `), [batchId, product_id, batch_number, manufacture_date || null, expiry_date || null, unit_price || 0, qty_received, now, now]);
        }

        // Create GR item
        await client.query(convertParams('INSERT INTO goods_receipt_items (id, goods_receipt_id, product_id, product_batch_id, qty_received, unit_price) VALUES (?, ?, ?, ?, ?, ?)'),
          [uuidv4(), id, product_id, batchId, qty_received, unit_price || 0]);

        // Create stock movement
        await client.query(convertParams('INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)'),
          [uuidv4(), product_id, batchId, 'in', 'goods_receipt', id, qty_received, unit_price || 0, `Penerimaan barang: ${receiptNumber}`, req.user.id, now]);

        // Update PO item qty_received
        await client.query(convertParams('UPDATE purchase_order_items SET qty_received = qty_received + ? WHERE purchase_order_id = ? AND product_id = ?'),
          [qty_received, purchase_order_id, product_id]);
      }

      // Check if PO is fully received
      const { rows: poItems } = await client.query(convertParams('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?'), [purchase_order_id]);
      const allReceived = poItems.every(item => item.qty_received >= item.qty_ordered);
      const someReceived = poItems.some(item => item.qty_received > 0);

      if (allReceived) {
        await client.query(convertParams('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?'), ['completed', now, purchase_order_id]);
      } else if (someReceived) {
        await client.query(convertParams('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?'), ['partial', now, purchase_order_id]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Set due_date on PO
    const receivedDate = received_date || now;
    const dueDate = new Date(new Date(receivedDate).getTime() + 30*24*60*60*1000).toISOString().split('T')[0];
    await execute('UPDATE purchase_orders SET due_date = COALESCE(due_date, ?), updated_at = ? WHERE id = ?', [dueDate, now, purchase_order_id]);

    const gr = await queryOne('SELECT * FROM goods_receipts WHERE id = ?', [id]);
    logAudit(req.user?.id, 'create_goods_receipt', 'goods_receipt', id, { receipt_number: receiptNumber, purchase_order_id });
    res.status(201).json(gr);
  } catch (err) {
    console.error('Create GR error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat penerimaan barang.' });
  }
});

// ============================================================
// INVOICES routes — MUST be before /:id to avoid conflicts
// ============================================================

// GET /api/invoices
router.get('/invoices', verifyToken, async (req, res) => {
  try {
    const invoices = await query(`
      SELECT po.id, po.po_number, po.order_date, po.status, po.total_amount,
             po.payment_status, po.due_date, po.paid_at,
             s.name as supplier_name,
             gr.receipt_number, gr.received_date
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id
      WHERE po.status IN ('completed', 'partial')
      ORDER BY po.created_at DESC
    `);

    const now = new Date();
    const result = invoices.map(inv => {
      let paymentStatus = inv.payment_status || 'unpaid';
      const dueDate = inv.due_date || (inv.received_date ? new Date(new Date(inv.received_date).getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : null);
      if (paymentStatus !== 'paid' && dueDate && new Date(dueDate) < now) {
        paymentStatus = 'overdue';
      }
      return { ...inv, payment_status: paymentStatus, due_date: dueDate, received_date: inv.received_date || inv.order_date };
    });
    res.json(result);
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar faktur.' });
  }
});

// GET /api/invoices/stats
router.get('/invoices/stats', verifyToken, async (req, res) => {
  try {
    const allInvoices = await query(`
      SELECT po.total_amount, po.payment_status, po.due_date, po.paid_at, po.order_date,
             gr.received_date
      FROM purchase_orders po
      LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id
      WHERE po.status IN ('completed', 'partial')
    `);

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    let totalDebt = 0, unpaidCount = 0, overdueCount = 0, paidThisMonth = 0;

    for (const inv of allInvoices) {
      const status = inv.payment_status || 'unpaid';
      const dueDate = inv.due_date || (inv.received_date ? new Date(new Date(inv.received_date).getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : null);
      if (status === 'paid') {
        if (inv.paid_at && String(inv.paid_at).slice(0, 7) === thisMonth) paidThisMonth += inv.total_amount || 0;
      } else {
        totalDebt += inv.total_amount || 0;
        unpaidCount++;
        if (dueDate && new Date(dueDate) < now) overdueCount++;
      }
    }
    res.json({ totalDebt, unpaidCount, overdueCount, paidThisMonth });
  } catch (err) {
    console.error('Invoice stats error:', err);
    res.status(500).json({ error: 'Gagal memuat statistik faktur.' });
  }
});

// PUT /api/invoices/:id/pay
router.put('/invoices/:id/pay', verifyToken, async (req, res) => {
  try {
    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Faktur tidak ditemukan.' });
    const now = new Date().toISOString();
    await execute('UPDATE purchase_orders SET payment_status = ?, paid_at = ?, updated_at = ? WHERE id = ?', ['paid', now, now, req.params.id]);
    logAudit(req.user?.id, 'pay_invoice', 'purchase_order', req.params.id, { po_number: po.po_number });
    res.json({ message: 'Faktur berhasil ditandai lunas.' });
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Gagal memproses pembayaran.' });
  }
});

// ============================================================
// PURCHASE ORDER CRUD
// ============================================================

// POST /api/purchase-orders
router.post('/', verifyToken, async (req, res) => {
  try {
    const { supplier_id, order_date, expected_date, notes, items } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'Supplier harus dipilih.' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Minimal satu item harus diisi.' });

    const id = uuidv4();
    const now = new Date().toISOString();

    const count = await queryOne('SELECT COUNT(*) as count FROM purchase_orders');
    const poNumber = `PO-${now.split('T')[0].replace(/-/g, '')}-${String(Number(count.count) + 1).padStart(4, '0')}`;

    let subtotal = 0, totalDiscount = 0, totalTax = 0;
    const processedItems = items.map(item => {
      const itemSubtotal = (item.qty_ordered || 0) * (item.unit_price || 0);
      const itemDiscount = item.discount_amount || 0;
      const itemTax = item.tax_amount || 0;
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
      return { id: uuidv4(), purchase_order_id: id, product_id: item.product_id, qty_ordered: item.qty_ordered || 0, qty_received: 0, unit_price: item.unit_price || 0, discount_amount: itemDiscount, tax_amount: itemTax, subtotal: itemSubtotal - itemDiscount + itemTax };
    });
    const totalAmount = subtotal - totalDiscount + totalTax;

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(convertParams(`INSERT INTO purchase_orders (id, supplier_id, po_number, order_date, expected_date, status, subtotal, discount_amount, tax_amount, total_amount, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`),
        [id, supplier_id, poNumber, order_date || now, expected_date || null, subtotal, totalDiscount, totalTax, totalAmount, notes || null, req.user.id, now, now]);
      for (const item of processedItems) {
        await client.query(convertParams('INSERT INTO purchase_order_items (id, purchase_order_id, product_id, qty_ordered, qty_received, unit_price, discount_amount, tax_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
          [item.id, item.purchase_order_id, item.product_id, item.qty_ordered, item.qty_received, item.unit_price, item.discount_amount, item.tax_amount, item.subtotal]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    logAudit(req.user?.id, 'create_purchase_order', 'purchase_order', id, { po_number: poNumber, supplier_id });
    res.status(201).json(po);
  } catch (err) {
    console.error('Create PO error:', err);
    res.status(500).json({ error: 'Gagal membuat Purchase Order.' });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const po = await queryOne(`
      SELECT po.*, s.name as supplier_name, u.full_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = ?
    `, [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });

    const items = await query(`
      SELECT poi.*, p.name as product_name, p.sku
      FROM purchase_order_items poi
      LEFT JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
    `, [req.params.id]);

    res.json({ ...po, items });
  } catch (err) {
    console.error('Get PO error:', err);
    res.status(500).json({ error: 'Gagal memuat detail PO.' });
  }
});

// PUT /api/purchase-orders/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });
    if (existing.status !== 'draft') return res.status(400).json({ error: 'Hanya PO berstatus draft yang bisa diubah.' });

    const { supplier_id, order_date, expected_date, notes, items } = req.body;
    const now = new Date().toISOString();

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      if (items && Array.isArray(items)) {
        await client.query(convertParams('DELETE FROM purchase_order_items WHERE purchase_order_id = ?'), [req.params.id]);
        let subtotal = 0, totalDiscount = 0, totalTax = 0;
        for (const item of items) {
          const itemSubtotal = (item.qty_ordered || 0) * (item.unit_price || 0);
          const itemDiscount = item.discount_amount || 0;
          const itemTax = item.tax_amount || 0;
          subtotal += itemSubtotal;
          totalDiscount += itemDiscount;
          totalTax += itemTax;
          await client.query(convertParams('INSERT INTO purchase_order_items (id, purchase_order_id, product_id, qty_ordered, qty_received, unit_price, discount_amount, tax_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
            [uuidv4(), req.params.id, item.product_id, item.qty_ordered || 0, 0, item.unit_price || 0, itemDiscount, itemTax, itemSubtotal - itemDiscount + itemTax]);
        }
        const totalAmount = subtotal - totalDiscount + totalTax;
        await client.query(convertParams('UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, notes = ?, subtotal = ?, discount_amount = ?, tax_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?'),
          [supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date, notes !== undefined ? notes : existing.notes, subtotal, totalDiscount, totalTax, totalAmount, now, req.params.id]);
      } else {
        await client.query(convertParams('UPDATE purchase_orders SET supplier_id = ?, order_date = ?, expected_date = ?, notes = ?, updated_at = ? WHERE id = ?'),
          [supplier_id || existing.supplier_id, order_date || existing.order_date, expected_date || existing.expected_date, notes !== undefined ? notes : existing.notes, now, req.params.id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    res.json(po);
  } catch (err) {
    console.error('Update PO error:', err);
    res.status(500).json({ error: 'Gagal mengupdate PO.' });
  }
});

// PUT /api/purchase-orders/:id/status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Purchase Order tidak ditemukan.' });

    const { status } = req.body;
    const validStatuses = ['draft', 'approved', 'ordered', 'partial', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: `Status tidak valid. Gunakan: ${validStatuses.join(', ')}` });

    await execute('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), req.params.id]);
    res.json({ message: 'Status PO berhasil diubah.', status });
  } catch (err) {
    console.error('Update PO status error:', err);
    res.status(500).json({ error: 'Gagal mengubah status PO.' });
  }
});

module.exports = router;
