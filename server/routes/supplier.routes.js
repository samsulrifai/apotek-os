const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/suppliers
router.get('/', verifyToken, async (req, res) => {
  try {
    const { is_active } = req.query;
    let sql = 'SELECT * FROM suppliers';
    const params = [];
    if (is_active !== undefined) {
      sql += ' WHERE is_active = ?';
      params.push(parseInt(is_active));
    }
    sql += ' ORDER BY name ASC';
    const suppliers = await query(sql, params);
    res.json(suppliers);
  } catch (err) {
    console.error('List suppliers error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar supplier.' });
  }
});

// POST /api/suppliers
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, address, contact_person } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama supplier harus diisi.' });
    const id = uuidv4();
    const now = new Date().toISOString();
    await execute(`INSERT INTO suppliers (id, name, phone, email, address, contact_person, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, phone || null, email || null, address || null, contact_person || null, now, now]);
    const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
    logAudit(req.user?.id, 'create_supplier', 'supplier', id, { name });
    res.status(201).json(supplier);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Gagal membuat supplier.' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
    const { name, phone, email, address, contact_person, is_active } = req.body;
    const now = new Date().toISOString();
    await execute(`UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, contact_person = ?, is_active = ?, updated_at = ? WHERE id = ?`, [
      name !== undefined ? name : existing.name,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      address !== undefined ? address : existing.address,
      contact_person !== undefined ? contact_person : existing.contact_person,
      is_active !== undefined ? is_active : existing.is_active,
      now, req.params.id
    ]);
    const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    logAudit(req.user?.id, 'update_supplier', 'supplier', req.params.id, { name: name || existing.name });
    res.json(supplier);
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ error: 'Gagal mengupdate supplier.' });
  }
});

// DELETE /api/suppliers/:id — soft delete
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const existing = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
    await execute('UPDATE suppliers SET is_active = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    logAudit(req.user?.id, 'delete_supplier', 'supplier', req.params.id, { name: existing.name });
    res.json({ message: 'Supplier berhasil dinonaktifkan.' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: 'Gagal menghapus supplier.' });
  }
});

module.exports = router;
