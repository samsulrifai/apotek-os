const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/categories
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json(categories);
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar kategori.' });
  }
});

// POST /api/categories
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama kategori harus diisi.' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)').run(id, name, description || null);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    logAudit(req.user?.id, 'create_category', 'category', id, { name });
    res.status(201).json(category);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Gagal membuat kategori.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama kategori harus diisi.' });
    }

    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, req.params.id);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    logAudit(req.user?.id, 'update_category', 'category', req.params.id, { name });
    res.json(category);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Gagal mengupdate kategori.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    }

    // Check if products are using this category
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(req.params.id);
    if (productCount.count > 0) {
      return res.status(409).json({ error: `Tidak dapat menghapus kategori. Masih digunakan oleh ${productCount.count} produk.` });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    logAudit(req.user?.id, 'delete_category', 'category', req.params.id, { name: existing.name });
    res.json({ message: 'Kategori berhasil dihapus.' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Gagal menghapus kategori.' });
  }
});

module.exports = router;
