const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/users
router.get('/', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.id, u.full_name, u.email, u.username, u.status, u.last_login_at, u.created_at, u.updated_at
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    // Attach roles
    const getRoles = db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `);

    for (const user of users) {
      user.roles = getRoles.all(user.id).map(r => r.name);
    }

    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Gagal memuat daftar pengguna.' });
  }
});

// POST /api/users — create user
router.post('/', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const { full_name, email, username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password harus diisi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username sudah digunakan.' });
    }

    if (email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (emailExists) {
        return res.status(409).json({ error: 'Email sudah digunakan.' });
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, full_name, email, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, full_name || username, email || null, username, passwordHash, now, now);

      // Assign role
      if (role) {
        const roleRecord = db.prepare('SELECT id FROM roles WHERE name = ?').get(role);
        if (roleRecord) {
          db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(uuidv4(), id, roleRecord.id);
        }
      }
    });

    transaction();

    const user = db.prepare('SELECT id, full_name, email, username, status, created_at FROM users WHERE id = ?').get(id);
    const roles = db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(id).map(r => r.name);

    res.status(201).json({ ...user, roles });
    logAudit(req.user?.id, 'create_user', 'user', id, { username, role });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Gagal membuat pengguna.' });
  }
});

// PUT /api/users/change-password (current user changes own password)
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const db = getDb();
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Password lama dan baru wajib diisi.' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password lama tidak sesuai.' });

    const hash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hash, req.user.id);
    db._save();
    logAudit(req.user.id, 'change_password', 'user', req.user.id);
    res.json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal mengubah password.' });
  }
});

// PUT /api/users/:id
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const { full_name, email, username, password, role } = req.body;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      let passwordHash = existing.password_hash;
      if (password) {
        if (password.length < 6) throw new Error('Password minimal 6 karakter.');
        passwordHash = bcrypt.hashSync(password, 10);
      }

      db.prepare(`
        UPDATE users SET full_name = ?, email = ?, username = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
      `).run(
        full_name !== undefined ? full_name : existing.full_name,
        email !== undefined ? email : existing.email,
        username !== undefined ? username : existing.username,
        passwordHash,
        now,
        req.params.id
      );

      // Update role if provided
      if (role) {
        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(req.params.id);
        const roleRecord = db.prepare('SELECT id FROM roles WHERE name = ?').get(role);
        if (roleRecord) {
          db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(uuidv4(), req.params.id, roleRecord.id);
        }
      }
    });

    transaction();

    const user = db.prepare('SELECT id, full_name, email, username, status, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    const roles = db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(req.params.id).map(r => r.name);

    res.json({ ...user, roles });
    logAudit(req.user?.id, 'update_user', 'user', req.params.id, { username: username || existing.username });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message || 'Gagal mengupdate pengguna.' });
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status harus "active" atau "inactive".' });
    }

    // Prevent deactivating self
    if (req.params.id === req.user.id && status === 'inactive') {
      return res.status(400).json({ error: 'Tidak bisa menonaktifkan akun sendiri.' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), req.params.id);

    logAudit(req.user?.id, 'update_user_status', 'user', req.params.id, { status });
    res.json({ message: `Status pengguna berhasil diubah menjadi ${status}.` });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Gagal mengubah status pengguna.' });
  }
});

module.exports = router;
