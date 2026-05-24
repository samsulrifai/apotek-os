const { Pool } = require('pg');

// ─── Pool (lazy singleton) ─────────────────────────────────────────────────
// We create the pool lazily so that missing DATABASE_URL at module load time
// does not crash the process — the error will be thrown on the first query,
// which gives a cleaner 500 with a useful message instead of a cold-start crash.

let _pool = null;

function getPool() {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Set it in Vercel → Settings → Environment Variables.'
      );
    }

    _pool = new Pool({
      connectionString,
      ssl: connectionString.includes('supabase')
        ? { rejectUnauthorized: false }
        : false,
      max: 5,                     // keep low for serverless (each fn has own pool)
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    _pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err.message);
    });
  }
  return _pool;
}

// ─── Placeholder converter ─────────────────────────────────────────────────
/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... style.
 * Skips ? characters inside single-quoted strings.
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

// ─── Query helpers ─────────────────────────────────────────────────────────

/**
 * Execute a query and return all rows.
 * Replaces: db.prepare(sql).all(...params)
 */
async function query(sql, params = []) {
  const pgSql = convertParams(sql);
  const { rows } = await getPool().query(pgSql, params);
  return rows;
}

/**
 * Execute a query and return the first row or undefined.
 * Replaces: db.prepare(sql).get(...params)
 */
async function queryOne(sql, params = []) {
  const pgSql = convertParams(sql);
  const { rows } = await getPool().query(pgSql, params);
  return rows[0] || undefined;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE) and return { rowCount }.
 * Replaces: db.prepare(sql).run(...params)
 */
async function execute(sql, params = []) {
  const pgSql = convertParams(sql);
  const result = await getPool().query(pgSql, params);
  return { changes: result.rowCount, rowCount: result.rowCount };
}

// ─── Connection test (used by local dev startup) ───────────────────────────
async function initializeDatabase() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[DB] Connected to Supabase PostgreSQL successfully.');
  } finally {
    client.release();
  }
}

module.exports = { query, queryOne, execute, getPool, convertParams, initializeDatabase };
