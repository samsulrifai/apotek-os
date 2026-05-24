const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute, getPool, convertParams } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// POST /api/sales — create sale with FEFO batch allocation
router.post('/', verifyToken, async (req, res) => {
  try {
    const { items, payment_method, paid_amount, customer_name, notes, sale_type } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Minimal satu item harus diisi.' });
    }
    if (!paid_amount && paid_amount !== 0) {
      return res.status(400).json({ error: 'Jumlah pembayaran harus diisi.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const today = now.split('T')[0].replace(/-/g, '');
    const effectiveSaleType = sale_type || 'otc';

    const todayCount = await queryOne('SELECT COUNT(*) as count FROM sales WHERE sale_number LIKE ?', [`TRX-${today}-%`]);
    const saleNumber = `TRX-${today}-${String(Number(todayCount.count) + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalDiscount = 0;

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      const processedItems = [];

      for (const item of items) {
        const { product_id, qty, unit_price, discount_amount = 0 } = item;
        if (!product_id || !qty || qty <= 0) throw new Error('product_id dan qty harus diisi dan qty > 0.');

        const { rows: prodRows } = await client.query(convertParams('SELECT * FROM products WHERE id = ? AND is_active = 1'), [product_id]);
        const product = prodRows[0];
        if (!product) throw new Error('Produk tidak ditemukan atau tidak aktif.');

        const restrictedClasses = ['keras', 'narkotika', 'psikotropika'];
        if (restrictedClasses.includes(product.drug_class) && effectiveSaleType !== 'prescription') {
          throw new Error(`Produk "${product.name}" (${product.drug_class}) hanya bisa dijual dengan resep.`);
        }

        const itemPrice = unit_price !== undefined ? unit_price : product.selling_price;
        const itemSubtotal = (itemPrice * qty) - discount_amount;
        subtotal += itemPrice * qty;
        totalDiscount += discount_amount;

        const { rows: batches } = await client.query(convertParams(`
          SELECT * FROM product_batches
          WHERE product_id = ? AND status = 'active' AND qty_on_hand > 0
          ORDER BY expiry_date ASC
        `), [product_id]);

        const totalAvailable = batches.reduce((sum, b) => sum + b.qty_on_hand, 0);
        if (totalAvailable < qty) throw new Error(`Stok "${product.name}" tidak mencukupi. Tersedia: ${totalAvailable}, Dibutuhkan: ${qty}.`);

        const saleItemId = uuidv4();
        processedItems.push({ id: saleItemId, sale_id: id, product_id, product_name: product.name, qty, unit_price: itemPrice, discount_amount, subtotal: itemSubtotal });

        let remainingQty = qty;
        for (const batch of batches) {
          if (remainingQty <= 0) break;
          if (batch.expiry_date && new Date(batch.expiry_date) < new Date(now.split('T')[0])) continue;

          const allocQty = Math.min(remainingQty, batch.qty_on_hand);
          await client.query(convertParams('INSERT INTO sale_item_batches (id, sale_item_id, product_batch_id, qty) VALUES (?, ?, ?, ?)'), [uuidv4(), saleItemId, batch.id, allocQty]);
          await client.query(convertParams('UPDATE product_batches SET qty_on_hand = qty_on_hand - ?, updated_at = ? WHERE id = ?'), [allocQty, now, batch.id]);
          await client.query(convertParams('INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)'),
            [uuidv4(), product_id, batch.id, 'out', 'sale', id, allocQty, batch.purchase_price, `Penjualan: ${saleNumber}`, req.user.id, now]);

          remainingQty -= allocQty;
        }
        if (remainingQty > 0) throw new Error(`Tidak dapat mengalokasikan stok yang cukup untuk "${product.name}".`);
      }

      const totalAmount = subtotal - totalDiscount;
      const changeAmount = (paid_amount || 0) - totalAmount;
      if (changeAmount < 0) throw new Error('Jumlah pembayaran kurang dari total belanja.');

      await client.query(convertParams(`
        INSERT INTO sales (id, sale_number, customer_name, cashier_id, sale_type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, notes, sold_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `), [id, saleNumber, customer_name || null, req.user.id, effectiveSaleType, subtotal, totalDiscount, totalAmount, paid_amount || 0, changeAmount > 0 ? changeAmount : 0, payment_method || 'cash', notes || null, now, now, now]);

      for (const item of processedItems) {
        await client.query(convertParams('INSERT INTO sale_items (id, sale_id, product_id, product_name, qty, unit_price, discount_amount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
          [item.id, item.sale_id, item.product_id, item.product_name, item.qty, item.unit_price, item.discount_amount, item.subtotal]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const sale = await queryOne('SELECT * FROM sales WHERE id = ?', [id]);
    logAudit(req.user?.id, 'create_sale', 'sale', id, { sale_number: saleNumber, total_amount: sale.total_amount });
    res.status(201).json(sale);
  } catch (err) {
    console.error('Create sale error:', err);
    res.status(400).json({ error: err.message || 'Gagal membuat penjualan.' });
  }
});

// GET /api/sales — list sales
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, start_date, end_date, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(s.sale_number LIKE ? OR s.customer_name LIKE ?)');
      const srch = `%${search}%`;
      params.push(srch, srch);
    }
    if (start_date) { conditions.push('s.sold_at::date >= ?::date'); params.push(start_date); }
    if (end_date) { conditions.push('s.sold_at::date <= ?::date'); params.push(end_date); }
    if (status) { conditions.push('s.status = ?'); params.push(status); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = await queryOne(`SELECT COUNT(*) as count FROM sales s ${whereClause}`, params);

    const sales = await query(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ${whereClause}
      ORDER BY s.sold_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      data: sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        totalPages: Math.ceil(total.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List sales error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar penjualan.' });
  }
});

// GET /api/sales/recent — last 10 sales
router.get('/recent', verifyToken, async (req, res) => {
  try {
    const sales = await query(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ORDER BY s.sold_at DESC
      LIMIT 10
    `);
    res.json(sales);
  } catch (err) {
    console.error('Recent sales error:', err);
    res.status(500).json({ error: 'Gagal memuat penjualan terbaru.' });
  }
});

// GET /api/sales/returns — list all sales returns
router.get('/returns', verifyToken, async (req, res) => {
  try {
    const returns = await query(`
      SELECT sr.*, s.sale_number, u.full_name as created_by_name
      FROM sales_returns sr
      LEFT JOIN sales s ON s.id = sr.sale_id
      LEFT JOIN users u ON u.id = sr.created_by
      ORDER BY sr.created_at DESC
    `);
    res.json(returns);
  } catch (err) {
    console.error('List returns error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar retur.' });
  }
});

// POST /api/sales/returns — create a sales return
router.post('/returns', verifyToken, async (req, res) => {
  try {
    const { sale_id, items, reason, notes } = req.body;
    if (!sale_id || !items?.length) return res.status(400).json({ error: 'Data retur tidak lengkap.' });

    const sale = await queryOne('SELECT * FROM sales WHERE id = ?', [sale_id]);
    if (!sale) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });

    const returnNumber = `RET-${Date.now()}`;
    const returnId = uuidv4();
    const now = new Date().toISOString();
    let totalRefund = 0;

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      await client.query(convertParams('INSERT INTO sales_returns (id, sale_id, return_number, reason, notes, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
        [returnId, sale_id, returnNumber, reason || '', notes || '', 'completed', req.user?.id, now]);

      for (const item of items) {
        const subtotalItem = item.qty_returned * item.unit_price;
        totalRefund += subtotalItem;
        await client.query(convertParams('INSERT INTO sales_return_items (id, sales_return_id, sale_item_id, product_id, qty_returned, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)'),
          [uuidv4(), returnId, item.sale_item_id || null, item.product_id, item.qty_returned, item.unit_price, subtotalItem]);

        const { rows: batchRows } = await client.query(convertParams("SELECT * FROM product_batches WHERE product_id = ? AND status = 'active' ORDER BY expiry_date ASC LIMIT 1"), [item.product_id]);
        if (batchRows[0]) {
          await client.query(convertParams('UPDATE product_batches SET qty_on_hand = qty_on_hand + ?, updated_at = NOW() WHERE id = ?'), [item.qty_returned, batchRows[0].id]);
          await client.query(convertParams('INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'),
            [uuidv4(), item.product_id, batchRows[0].id, 'in', 'return', returnId, item.qty_returned, 'Retur Penjualan', req.user?.id]);
        }
      }

      await client.query(convertParams('UPDATE sales_returns SET total_refund = ? WHERE id = ?'), [totalRefund, returnId]);

      const { rows: allItemRows } = await client.query(convertParams('SELECT SUM(qty) as total_qty FROM sale_items WHERE sale_id = ?'), [sale_id]);
      const { rows: returnedItemRows } = await client.query(convertParams('SELECT SUM(qty_returned) as total_returned FROM sales_return_items sri JOIN sales_returns sr ON sr.id = sri.sales_return_id WHERE sr.sale_id = ?'), [sale_id]);
      const newStatus = (returnedItemRows[0]?.total_returned >= allItemRows[0]?.total_qty) ? 'returned_full' : 'returned_partial';
      await client.query(convertParams('UPDATE sales SET status = ?, updated_at = NOW() WHERE id = ?'), [newStatus, sale_id]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    logAudit(req.user?.id, 'create_return', 'sales_return', returnId, { sale_id, totalRefund });
    res.status(201).json({ id: returnId, return_number: returnNumber, total_refund: totalRefund });
  } catch (err) {
    console.error('Create return error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat retur penjualan.' });
  }
});

// GET /api/sales/:id — sale detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sale = await queryOne(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!sale) return res.status(404).json({ error: 'Penjualan tidak ditemukan.' });

    const items = await query(`
      SELECT si.*, p.sku, p.generic_name
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    for (const item of items) {
      item.batch_allocations = await query(`
        SELECT sib.*, pb.batch_number, pb.expiry_date
        FROM sale_item_batches sib
        JOIN product_batches pb ON pb.id = sib.product_batch_id
        WHERE sib.sale_item_id = ?
      `, [item.id]);
    }

    res.json({ ...sale, items });
  } catch (err) {
    console.error('Get sale error:', err);
    res.status(500).json({ error: 'Gagal memuat detail penjualan.' });
  }
});

module.exports = router;
