const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { verifyToken, JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password harus diisi.' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun tidak aktif. Hubungi administrator.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    // Get roles
    const roles = db.prepare(`
      SELECT r.id, r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(user.id);

    // Update last_login_at
    db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        username: user.username,
        status: user.status,
        roles: roles.map(r => r.name),
        last_login_at: user.last_login_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout berhasil.' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, full_name, email, username, status, last_login_at, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const roles = db.prepare(`
      SELECT r.id, r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(user.id);

    res.json({
      ...user,
      roles: roles.map(r => r.name)
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

module.exports = router;
