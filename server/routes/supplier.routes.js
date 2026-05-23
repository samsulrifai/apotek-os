const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { is_active } = req.query;
    let query = 'SELECT * FROM suppliers';
    const params = [];

    if (is_active !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(parseInt(is_active));
    }

    query += ' ORDER BY name ASC';
    const suppliers = db.prepare(query).all(...params);
    res.json(suppliers);
  } catch (err) {
    console.error('List suppliers error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar supplier.' });
  }
});

// POST /api/suppliers
router.post('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { name, phone, email, address, contact_person } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nama supplier harus diisi.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO suppliers (id, name, phone, email, address, contact_person, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, phone || null, email || null, address || null, contact_person || null, now, now);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.status(201).json(supplier);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Gagal membuat supplier.' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
    }

    const { name, phone, email, address, contact_person, is_active } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE suppliers SET
        name = ?, phone = ?, email = ?, address = ?, contact_person = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : existing.name,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      address !== undefined ? address : existing.address,
      contact_person !== undefined ? contact_person : existing.contact_person,
      is_active !== undefined ? is_active : existing.is_active,
      now,
      req.params.id
    );

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    res.json(supplier);
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ error: 'Gagal mengupdate supplier.' });
  }
});

// DELETE /api/suppliers/:id — soft delete
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
    }

    db.prepare('UPDATE suppliers SET is_active = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), req.params.id);

    res.json({ message: 'Supplier berhasil dinonaktifkan.' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: 'Gagal menghapus supplier.' });
  }
});

module.exports = router;
