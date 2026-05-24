const router = require('express').Router();
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 50, entity_type, action, user_id } = req.query;
    let sql = `SELECT al.*, u.full_name as user_name FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE 1=1`;
    const params = [];
    if (entity_type) { sql += ' AND al.entity_type = ?'; params.push(entity_type); }
    if (action) { sql += ' AND al.action = ?'; params.push(action); }
    if (user_id) { sql += ' AND al.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const logs = db.prepare(sql).all(...params);
    res.json(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Gagal memuat audit log.' });
  }
});

module.exports = router;
