const { Pool } = require('pg');

// Connection pool — works with Supabase direct or pooler connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... style.
 * Handles ? inside single-quoted strings by skipping them.
 */
function convertParams(sql) {
  let idx = 0;
  let inString = false;
  let result = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') {
      inString = !inString;
      result += ch;
    } else if (ch === '?' && !inString) {
      result += `$${++idx}`;
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Execute a query and return all rows.
 * Replaces: db.prepare(sql).all(...params)
 */
async function query(sql, params = []) {
  const pgSql = convertParams(sql);
  const { rows } = await pool.query(pgSql, params);
  return rows;
}

/**
 * Execute a query and return the first row or undefined.
 * Replaces: db.prepare(sql).get(...params)
 */
async function queryOne(sql, params = []) {
  const pgSql = convertParams(sql);
  const { rows } = await pool.query(pgSql, params);
  return rows[0] || undefined;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE) and return { rowCount }.
 * Replaces: db.prepare(sql).run(...params)
 */
async function execute(sql, params = []) {
  const pgSql = convertParams(sql);
  const result = await pool.query(pgSql, params);
  return { changes: result.rowCount, rowCount: result.rowCount };
}

/**
 * Get the raw pool for transactions.
 */
function getPool() {
  return pool;
}

/**
 * Test the database connection.
 */
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connected successfully (Supabase PostgreSQL).');
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    throw err;
  }
}

module.exports = { query, queryOne, execute, getPool, convertParams, initializeDatabase };
