const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/units
router.get('/', verifyToken, async (req, res) => {
  try {
    const units = await query(`
      SELECT u.*, COUNT(p.id) as product_count
      FROM units u
      LEFT JOIN products p ON p.unit_id = u.id AND p.is_active = 1
      GROUP BY u.id, u.name, u.symbol
      ORDER BY u.name ASC
    `);
    res.json(units);
  } catch (err) {
    console.error('List units error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar satuan.' });
  }
});

// POST /api/units
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, symbol } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama satuan harus diisi.' });
    const id = uuidv4();
    await execute('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)', [id, name, symbol || null]);
    const unit = await queryOne('SELECT * FROM units WHERE id = ?', [id]);
    logAudit(req.user?.id, 'create_unit', 'unit', id, { name });
    res.status(201).json(unit);
  } catch (err) {
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Gagal membuat satuan.' });
  }
});

// PUT /api/units/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Satuan tidak ditemukan.' });
    const { name, symbol } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama satuan harus diisi.' });
    await execute('UPDATE units SET name = ?, symbol = ? WHERE id = ?', [name, symbol || null, req.params.id]);
    const unit = await queryOne('SELECT * FROM units WHERE id = ?', [req.params.id]);
    logAudit(req.user?.id, 'update_unit', 'unit', req.params.id, { name });
    res.json(unit);
  } catch (err) {
    console.error('Update unit error:', err);
    res.status(500).json({ error: 'Gagal mengupdate satuan.' });
  }
});

// DELETE /api/units/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM units WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Satuan tidak ditemukan.' });
    const productCount = await queryOne('SELECT COUNT(*) as count FROM products WHERE unit_id = ?', [req.params.id]);
    if (productCount.count > 0) {
      return res.status(409).json({ error: `Tidak dapat menghapus satuan. Masih digunakan oleh ${productCount.count} produk.` });
    }
    await execute('DELETE FROM units WHERE id = ?', [req.params.id]);
    logAudit(req.user?.id, 'delete_unit', 'unit', req.params.id, { name: existing.name });
    res.json({ message: 'Satuan berhasil dihapus.' });
  } catch (err) {
    console.error('Delete unit error:', err);
    res.status(500).json({ error: 'Gagal menghapus satuan.' });
  }
});

module.exports = router;
