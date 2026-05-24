const { initializeDatabase, getDb } = require('../db/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let testToken = null;
let testUserId = null;

async function setupTestDb() {
  await initializeDatabase();
  const db = getDb();

  // Create test admin user if not exists
  testUserId = uuidv4();
  const hash = await bcrypt.hash('test123', 10);
  try {
    db.prepare('INSERT INTO users (id, full_name, email, username, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)').run(testUserId, 'Test Admin', 'test@test.com', 'testadmin', hash, 'active');
    // Create admin role if not exists
    const role = db.prepare('SELECT id FROM roles WHERE name = ?').get('admin');
    let roleId = role?.id;
    if (!roleId) {
      roleId = uuidv4();
      db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)').run(roleId, 'admin');
    }
    db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(uuidv4(), testUserId, roleId);
    db._save();
  } catch (e) {
    // User might already exist
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('testadmin');
    if (existingUser) testUserId = existingUser.id;
  }

  testToken = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '1h' });
  return { db, testToken, testUserId };
}

module.exports = { setupTestDb };
