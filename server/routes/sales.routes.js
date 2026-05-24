const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// POST /api/sales — create sale with FEFO batch allocation
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
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

    // Generate sale number
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM sales WHERE sale_number LIKE ?
    `).get(`TRX-${today}-%`);
    const saleNumber = `TRX-${today}-${String(todayCount.count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalDiscount = 0;

    const transaction = db.transaction(() => {
      const processedItems = [];

      for (const item of items) {
        const { product_id, qty, unit_price, discount_amount = 0 } = item;

        if (!product_id || !qty || qty <= 0) {
          throw new Error('product_id dan qty harus diisi dan qty > 0.');
        }

        // Get product info
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(product_id);
        if (!product) {
          throw new Error(`Produk tidak ditemukan atau tidak aktif.`);
        }

        // Check drug class restrictions
        const restrictedClasses = ['keras', 'narkotika', 'psikotropika'];
        if (restrictedClasses.includes(product.drug_class) && effectiveSaleType !== 'prescription') {
          throw new Error(`Produk "${product.name}" (${product.drug_class}) hanya bisa dijual dengan resep.`);
        }

        const itemPrice = unit_price !== undefined ? unit_price : product.selling_price;
        const itemSubtotal = (itemPrice * qty) - discount_amount;
        subtotal += itemPrice * qty;
        totalDiscount += discount_amount;

        // FEFO: Find active batches sorted by expiry_date ASC
        const batches = db.prepare(`
          SELECT * FROM product_batches
          WHERE product_id = ? AND status = 'active' AND qty_on_hand > 0
          ORDER BY expiry_date ASC
        `).all(product_id);

        // Check total available stock
        const totalAvailable = batches.reduce((sum, b) => sum + b.qty_on_hand, 0);
        if (totalAvailable < qty) {
          throw new Error(`Stok "${product.name}" tidak mencukupi. Tersedia: ${totalAvailable}, Dibutuhkan: ${qty}.`);
        }

        // Create sale item
        const saleItemId = uuidv4();
        processedItems.push({
          id: saleItemId,
          sale_id: id,
          product_id,
          product_name: product.name,
          qty,
          unit_price: itemPrice,
          discount_amount,
          subtotal: itemSubtotal
        });

        // Allocate from batches (FEFO)
        let remainingQty = qty;
        for (const batch of batches) {
          if (remainingQty <= 0) break;

          // Check if batch is expired
          if (batch.expiry_date && new Date(batch.expiry_date) < new Date(now.split('T')[0])) {
            continue; // Skip expired batches
          }

          const allocQty = Math.min(remainingQty, batch.qty_on_hand);

          // Create sale_item_batch
          db.prepare(`
            INSERT INTO sale_item_batches (id, sale_item_id, product_batch_id, qty)
            VALUES (?, ?, ?, ?)
          `).run(uuidv4(), saleItemId, batch.id, allocQty);

          // Deduct batch qty
          db.prepare('UPDATE product_batches SET qty_on_hand = qty_on_hand - ?, updated_at = ? WHERE id = ?')
            .run(allocQty, now, batch.id);

          // Create stock movement
          db.prepare(`
            INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at)
            VALUES (?, ?, ?, 'out', 'sale', ?, 0, ?, ?, ?, ?, ?)
          `).run(uuidv4(), product_id, batch.id, id, allocQty, batch.purchase_price, `Penjualan: ${saleNumber}`, req.user.id, now);

          remainingQty -= allocQty;
        }

        if (remainingQty > 0) {
          throw new Error(`Tidak dapat mengalokasikan stok yang cukup untuk "${product.name}".`);
        }
      }

      // Calculate totals
      const totalAmount = subtotal - totalDiscount;
      const changeAmount = (paid_amount || 0) - totalAmount;

      if (changeAmount < 0) {
        throw new Error('Jumlah pembayaran kurang dari total belanja.');
      }

      // Insert sale
      db.prepare(`
        INSERT INTO sales (id, sale_number, customer_name, cashier_id, sale_type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, notes, sold_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, saleNumber, customer_name || null, req.user.id, effectiveSaleType, subtotal, totalDiscount, totalAmount, paid_amount || 0, changeAmount > 0 ? changeAmount : 0, payment_method || 'cash', notes || null, now, now, now);

      // Insert sale items
      const insertSaleItem = db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, qty, unit_price, discount_amount, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of processedItems) {
        insertSaleItem.run(item.id, item.sale_id, item.product_id, item.product_name, item.qty, item.unit_price, item.discount_amount, item.subtotal);
      }
    });

    transaction();

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    logAudit(req.user?.id, 'create_sale', 'sale', id, { sale_number: saleNumber, total_amount: sale.total_amount });
    res.status(201).json(sale);
  } catch (err) {
    console.error('Create sale error:', err);
    res.status(400).json({ error: err.message || 'Gagal membuat penjualan.' });
  }
});

// GET /api/sales — list sales
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { search, start_date, end_date, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(s.sale_number LIKE ? OR s.customer_name LIKE ?)');
      const srch = `%${search}%`;
      params.push(srch, srch);
    }

    if (start_date) {
      conditions.push('DATE(s.sold_at) >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('DATE(s.sold_at) <= ?');
      params.push(end_date);
    }

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) as count FROM sales s ${whereClause}`).get(...params);

    const sales = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ${whereClause}
      ORDER BY s.sold_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

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
router.get('/recent', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const sales = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      ORDER BY s.sold_at DESC
      LIMIT 10
    `).all();

    res.json(sales);
  } catch (err) {
    console.error('Recent sales error:', err);
    res.status(500).json({ error: 'Gagal memuat penjualan terbaru.' });
  }
});

// GET /api/sales/returns — list all sales returns
router.get('/returns', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const returns = db.prepare(`
      SELECT sr.*, s.sale_number, u.full_name as created_by_name
      FROM sales_returns sr
      LEFT JOIN sales s ON s.id = sr.sale_id
      LEFT JOIN users u ON u.id = sr.created_by
      ORDER BY sr.created_at DESC
    `).all();
    res.json(returns);
  } catch (err) {
    console.error('List returns error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar retur.' });
  }
});

// POST /api/sales/returns — create a sales return
router.post('/returns', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { sale_id, items, reason, notes } = req.body;
    if (!sale_id || !items?.length) return res.status(400).json({ error: 'Data retur tidak lengkap.' });

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id);
    if (!sale) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });

    const returnNumber = `RET-${Date.now()}`;
    const returnId = uuidv4();
    const now = new Date().toISOString();
    let totalRefund = 0;

    const doReturn = db.transaction(() => {
      db.prepare('INSERT INTO sales_returns (id, sale_id, return_number, reason, notes, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(returnId, sale_id, returnNumber, reason || '', notes || '', 'completed', req.user?.id, now);

      for (const item of items) {
        const subtotal = item.qty_returned * item.unit_price;
        totalRefund += subtotal;
        db.prepare('INSERT INTO sales_return_items (id, sales_return_id, sale_item_id, product_id, qty_returned, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), returnId, item.sale_item_id || null, item.product_id, item.qty_returned, item.unit_price, subtotal);

        // Return stock to the first available batch
        const batch = db.prepare('SELECT * FROM product_batches WHERE product_id = ? AND status = "active" ORDER BY expiry_date ASC LIMIT 1').get(item.product_id);
        if (batch) {
          db.prepare('UPDATE product_batches SET qty_on_hand = qty_on_hand + ?, updated_at = datetime("now") WHERE id = ?').run(item.qty_returned, batch.id);
          db.prepare('INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))').run(uuidv4(), item.product_id, batch.id, 'in', 'return', returnId, item.qty_returned, 'Retur Penjualan', req.user?.id);
        }
      }

      db.prepare('UPDATE sales_returns SET total_refund = ? WHERE id = ?').run(totalRefund, returnId);
      // Update sale status
      const allItems = db.prepare('SELECT SUM(qty) as total_qty FROM sale_items WHERE sale_id = ?').get(sale_id);
      const returnedItems = db.prepare('SELECT SUM(qty_returned) as total_returned FROM sales_return_items sri JOIN sales_returns sr ON sr.id = sri.sales_return_id WHERE sr.sale_id = ?').get(sale_id);
      const newStatus = (returnedItems?.total_returned >= allItems?.total_qty) ? 'returned_full' : 'returned_partial';
      db.prepare('UPDATE sales SET status = ?, updated_at = datetime("now") WHERE id = ?').run(newStatus, sale_id);
    });
    doReturn();
    logAudit(req.user?.id, 'create_return', 'sales_return', returnId, { sale_id, totalRefund });
    res.status(201).json({ id: returnId, return_number: returnNumber, total_refund: totalRefund });
  } catch (err) {
    console.error('Create return error:', err);
    res.status(500).json({ error: err.message || 'Gagal membuat retur penjualan.' });
  }
});

// GET /api/sales/:id — sale detail
router.get('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const sale = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!sale) {
      return res.status(404).json({ error: 'Penjualan tidak ditemukan.' });
    }

    const items = db.prepare(`
      SELECT si.*, p.sku, p.generic_name
      FROM sale_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `).all(req.params.id);

    // Get batch allocations for each item
    for (const item of items) {
      item.batch_allocations = db.prepare(`
        SELECT sib.*, pb.batch_number, pb.expiry_date
        FROM sale_item_batches sib
        JOIN product_batches pb ON pb.id = sib.product_batch_id
        WHERE sib.sale_item_id = ?
      `).all(item.id);
    }

    res.json({ ...sale, items });
  } catch (err) {
    console.error('Get sale error:', err);
    res.status(500).json({ error: 'Gagal memuat detail penjualan.' });
  }
});

module.exports = router;

