const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/products — list with search, category filter, pagination
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { search, category_id, page = 1, limit = 20, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.generic_name LIKE ?)`);
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (is_active !== undefined) {
      conditions.push('p.is_active = ?');
      params.push(parseInt(is_active));
    } else {
      conditions.push('p.is_active = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`).get(...params);

    const products = db.prepare(`
      SELECT p.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol,
             COALESCE(SUM(pb.qty_on_hand), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        totalPages: Math.ceil(total.count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar produk.' });
  }
});

// GET /api/products/stats
router.get('/stats', verifyToken, (req, res) => {
  try {
    const db = getDb();

    const total = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const active = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get();
    const inactive = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 0').get();

    const byCategory = db.prepare(`
      SELECT c.name, COUNT(p.id) as count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY count DESC
    `).all();

    const lowStock = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT p.id FROM products p
        LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
        WHERE p.is_active = 1 AND p.min_stock > 0
        GROUP BY p.id
        HAVING COALESCE(SUM(pb.qty_on_hand), 0) < p.min_stock
      )
    `).get();

    res.json({
      total: total.count,
      active: active.count,
      inactive: inactive.count,
      byCategory,
      lowStock: lowStock.count
    });
  } catch (err) {
    console.error('Product stats error:', err);
    res.status(500).json({ error: 'Gagal memuat statistik produk.' });
  }
});

// GET /api/products/search?q= — quick search for POS
router.get('/search', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;

    if (!q || q.length < 1) {
      return res.json([]);
    }

    const search = `%${q}%`;
    const products = db.prepare(`
      SELECT p.id, p.sku, p.barcode, p.name, p.generic_name, p.selling_price, p.drug_class, p.form, p.strength,
             c.name as category_name,
             u.name as unit_name, u.symbol as unit_symbol,
             COALESCE(SUM(pb.qty_on_hand), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN product_batches pb ON pb.product_id = p.id AND pb.status = 'active'
      WHERE p.is_active = 1
        AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.generic_name LIKE ?)
      GROUP BY p.id
      HAVING total_stock > 0
      ORDER BY p.name ASC
      LIMIT 20
    `).all(search, search, search, search);

    res.json(products);
  } catch (err) {
    console.error('Product search error:', err);
    res.status(500).json({ error: 'Gagal mencari produk.' });
  }
});

// GET /api/products/:id — detail with batches
router.get('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, u.name as unit_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN units u ON u.id = p.unit_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }

    const batches = db.prepare(`
      SELECT * FROM product_batches
      WHERE product_id = ?
      ORDER BY expiry_date ASC
    `).all(req.params.id);

    const totalStock = batches.reduce((sum, b) => sum + (b.status === 'active' ? b.qty_on_hand : 0), 0);

    res.json({ ...product, batches, total_stock: totalStock });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Gagal memuat detail produk.' });
  }
});

// POST /api/products — create product
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const {
      category_id, unit_id, sku, barcode, name, generic_name,
      form, strength, manufacturer, drug_class,
      min_stock, default_purchase_price, selling_price, custom_margin
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama produk harus diisi.' });
    }

    // Generate SKU if not provided
    let finalSku = sku;
    if (!finalSku) {
      const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
      finalSku = `PRD-${String(count.count + 1).padStart(4, '0')}`;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (id, category_id, unit_id, sku, barcode, name, generic_name, form, strength, manufacturer, drug_class, min_stock, default_purchase_price, selling_price, custom_margin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, category_id || null, unit_id || null, finalSku, barcode || null, name, generic_name || null, form || null, strength || null, manufacturer || null, drug_class || 'bebas', min_stock || 0, default_purchase_price || 0, selling_price || 0, custom_margin !== undefined && custom_margin !== null ? custom_margin : null, now, now);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU atau barcode sudah digunakan.' });
    }
    res.status(500).json({ error: 'Gagal membuat produk.' });
  }
});

// PUT /api/products/:id — update product
router.put('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }

    const {
      category_id, unit_id, sku, barcode, name, generic_name,
      form, strength, manufacturer, drug_class,
      min_stock, default_purchase_price, selling_price, is_active, custom_margin
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE products SET
        category_id = ?, unit_id = ?, sku = ?, barcode = ?, name = ?, generic_name = ?,
        form = ?, strength = ?, manufacturer = ?, drug_class = ?,
        min_stock = ?, default_purchase_price = ?, selling_price = ?,
        custom_margin = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      category_id !== undefined ? category_id : existing.category_id,
      unit_id !== undefined ? unit_id : existing.unit_id,
      sku !== undefined ? sku : existing.sku,
      barcode !== undefined ? barcode : existing.barcode,
      name !== undefined ? name : existing.name,
      generic_name !== undefined ? generic_name : existing.generic_name,
      form !== undefined ? form : existing.form,
      strength !== undefined ? strength : existing.strength,
      manufacturer !== undefined ? manufacturer : existing.manufacturer,
      drug_class !== undefined ? drug_class : existing.drug_class,
      min_stock !== undefined ? min_stock : existing.min_stock,
      default_purchase_price !== undefined ? default_purchase_price : existing.default_purchase_price,
      selling_price !== undefined ? selling_price : existing.selling_price,
      custom_margin !== undefined ? (custom_margin !== null ? custom_margin : null) : existing.custom_margin,
      is_active !== undefined ? is_active : existing.is_active,
      now,
      req.params.id
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU atau barcode sudah digunakan.' });
    }
    res.status(500).json({ error: 'Gagal mengupdate produk.' });
  }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }

    db.prepare('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);

    res.json({ message: 'Produk berhasil dinonaktifkan.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Gagal menghapus produk.' });
  }
});

module.exports = router;
