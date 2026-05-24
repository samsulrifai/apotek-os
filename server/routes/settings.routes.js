const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, execute, getPool, convertParams } = require('../db/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLog');

// GET /api/settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await query('SELECT key, value FROM app_settings');
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Gagal memuat pengaturan.' });
  }
});

// PUT /api/settings — batch upsert
router.put('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Data pengaturan tidak valid.' });
    }

    const now = new Date().toISOString();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          convertParams('INSERT INTO app_settings (id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?'),
          [uuidv4(), key, String(value), now, String(value), now]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Return updated settings
    const allSettings = await query('SELECT key, value FROM app_settings');
    const result = {};
    allSettings.forEach(s => { result[s.key] = s.value; });
    logAudit(req.user?.id, 'update_settings', 'settings', null, { keys: Object.keys(settings) });
    res.json(result);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Gagal mengupdate pengaturan.' });
  }
});

module.exports = router;
