const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/units
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const units = db.prepare(`
      SELECT u.*, COUNT(p.id) as product_count
      FROM units u
      LEFT JOIN products p ON p.unit_id = u.id AND p.is_active = 1
      GROUP BY u.id
      ORDER BY u.name ASC
    `).all();
    res.json(units);
  } catch (err) {
    console.error('List units error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar satuan.' });
  }
});

// POST /api/units
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { name, symbol } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama satuan harus diisi.' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)').run(id, name, symbol || null);

    const unit = db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    logAudit(req.user?.id, 'create_unit', 'unit', id, { name });
    res.status(201).json(unit);
  } catch (err) {
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Gagal membuat satuan.' });
  }
});

// PUT /api/units/:id
router.put('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Satuan tidak ditemukan.' });
    }

    const { name, symbol } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama satuan harus diisi.' });
    }

    db.prepare('UPDATE units SET name = ?, symbol = ? WHERE id = ?').run(name, symbol || null, req.params.id);

    const unit = db.prepare('SELECT * FROM units WHERE id = ?').get(req.params.id);
    logAudit(req.user?.id, 'update_unit', 'unit', req.params.id, { name });
    res.json(unit);
  } catch (err) {
    console.error('Update unit error:', err);
    res.status(500).json({ error: 'Gagal mengupdate satuan.' });
  }
});

// DELETE /api/units/:id
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM units WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Satuan tidak ditemukan.' });
    }

    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE unit_id = ?').get(req.params.id);
    if (productCount.count > 0) {
      return res.status(409).json({ error: `Tidak dapat menghapus satuan. Masih digunakan oleh ${productCount.count} produk.` });
    }

    db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
    logAudit(req.user?.id, 'delete_unit', 'unit', req.params.id, { name: existing.name });
    res.json({ message: 'Satuan berhasil dihapus.' });
  } catch (err) {
    console.error('Delete unit error:', err);
    res.status(500).json({ error: 'Gagal menghapus satuan.' });
  }
});

module.exports = router;
