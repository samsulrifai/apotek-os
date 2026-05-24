const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function logAudit(userId, action, entityType, entityId, details = null) {
  try {
    const db = getDb();
    db.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))')
      .run(uuidv4(), userId, action, entityType, entityId, details ? JSON.stringify(details) : null);
    db._save();
  } catch (e) { console.error('Audit log error:', e.message); }
}

module.exports = { logAudit };
