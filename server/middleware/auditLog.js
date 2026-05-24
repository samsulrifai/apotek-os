const { execute } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function logAudit(userId, action, entityType, entityId, details = null) {
  // Fire-and-forget async audit log
  execute('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [uuidv4(), userId, action, entityType, entityId, details ? JSON.stringify(details) : null])
    .catch(e => console.error('Audit log error:', e.message));
}

module.exports = { logAudit };
