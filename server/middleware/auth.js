const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const JWT_SECRET = 'apotek-web-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT u.id, u.full_name, u.email, u.username, u.status FROM users u WHERE u.id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun tidak aktif.' });
    }

    const roles = db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(user.id).map(r => r.name);

    req.user = { ...user, roles };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token sudah expired. Silakan login kembali.' });
    }
    return res.status(401).json({ error: 'Token tidak valid.' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT u.id, u.full_name, u.email, u.username, u.status FROM users u WHERE u.id = ?').get(decoded.userId);

    if (user && user.status === 'active') {
      const roles = db.prepare(`
        SELECT r.name FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `).all(user.id).map(r => r.name);
      req.user = { ...user, roles };
    }
  } catch (err) {
    // Ignore token errors in optional auth
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    const hasRole = req.user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk fitur ini.' });
    }
    next();
  };
}

module.exports = { verifyToken, optionalAuth, requireRole, JWT_SECRET, JWT_EXPIRES_IN };
