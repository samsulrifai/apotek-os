const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// GET /api/settings
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT key, value FROM app_settings').all();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Gagal memuat pengaturan.' });
  }
});

// PUT /api/settings — batch upsert
router.put('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Data pengaturan tidak valid.' });
    }

    const now = new Date().toISOString();
    const upsert = db.prepare(`
      INSERT INTO app_settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `);

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(uuidv4(), key, String(value), now, String(value), now);
      }
    });

    transaction();

    // Return updated settings
    const allSettings = db.prepare('SELECT key, value FROM app_settings').all();
    const result = {};
    allSettings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Gagal mengupdate pengaturan.' });
  }
});

module.exports = router;
