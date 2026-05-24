const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'apotek.db');

let db = null;
let dbReady = null;

// Wrapper that provides a better-sqlite3 compatible API on top of sql.js
class DbWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        return { changes: self._db.getRowsModified() };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this._db.run(sql);
  }

  pragma(pragmaStr) {
    try {
      this._db.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      // Ignore pragma errors (some may not be supported in sql.js)
    }
  }

  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this._db.run('COMMIT');
        this._save();
        return result;
      } catch (e) {
        this._db.run('ROLLBACK');
        throw e;
      }
    };
  }

  _save() {
    try {
      const data = this._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
      console.error('Error saving database:', e.message);
    }
  }
}

async function initDb() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new DbWrapper(sqlDb);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

// Lazy async init — ensures db is ready
function getDbPromise() {
  if (!dbReady) {
    dbReady = initDb();
  }
  return dbReady;
}

// Sync getter (only works after init completes)
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

async function initializeDatabase() {
  const database = await getDbPromise();

  database.exec(`
    -- ========================
    -- AUTH TABLES
    -- ========================
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE(user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- ========================
    -- MASTER TABLES
    -- ========================
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      contact_person TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ========================
    -- PRODUCTS
    -- ========================
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      unit_id TEXT,
      sku TEXT UNIQUE,
      barcode TEXT,
      name TEXT NOT NULL,
      generic_name TEXT,
      form TEXT,
      strength TEXT,
      manufacturer TEXT,
      drug_class TEXT DEFAULT 'bebas',
      min_stock INTEGER DEFAULT 0,
      default_purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      custom_margin REAL DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (unit_id) REFERENCES units(id)
    );

    CREATE TABLE IF NOT EXISTS product_batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      manufacture_date TEXT,
      expiry_date TEXT,
      purchase_price REAL DEFAULT 0,
      qty_on_hand INTEGER DEFAULT 0,
      qty_reserved INTEGER DEFAULT 0,
      location_code TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(product_id, batch_number),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- ========================
    -- PURCHASING
    -- ========================
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT,
      po_number TEXT UNIQUE NOT NULL,
      order_date TEXT,
      expected_date TEXT,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      notes TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      due_date TEXT,
      paid_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      product_id TEXT,
      qty_ordered INTEGER,
      qty_received INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS goods_receipts (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT,
      receipt_number TEXT UNIQUE NOT NULL,
      received_date TEXT,
      received_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (received_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id TEXT PRIMARY KEY,
      goods_receipt_id TEXT NOT NULL,
      product_id TEXT,
      product_batch_id TEXT,
      qty_received INTEGER,
      unit_price REAL DEFAULT 0,
      FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (product_batch_id) REFERENCES product_batches(id)
    );

    -- ========================
    -- SALES
    -- ========================
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      cashier_id TEXT,
      sale_type TEXT DEFAULT 'otc',
      status TEXT DEFAULT 'paid',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      sold_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      qty INTEGER,
      unit_price REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sale_item_batches (
      id TEXT PRIMARY KEY,
      sale_item_id TEXT NOT NULL,
      product_batch_id TEXT,
      qty INTEGER,
      FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
      FOREIGN KEY (product_batch_id) REFERENCES product_batches(id)
    );

    -- ========================
    -- INVENTORY
    -- ========================
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_batch_id TEXT,
      movement_type TEXT,
      reference_type TEXT,
      reference_id TEXT,
      qty_in INTEGER DEFAULT 0,
      qty_out INTEGER DEFAULT 0,
      unit_cost REAL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id TEXT PRIMARY KEY,
      adjustment_number TEXT UNIQUE NOT NULL,
      reason TEXT,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_by TEXT,
      approved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stock_adjustment_items (
      id TEXT PRIMARY KEY,
      stock_adjustment_id TEXT NOT NULL,
      product_id TEXT,
      product_batch_id TEXT,
      qty_before INTEGER,
      qty_after INTEGER,
      qty_difference INTEGER,
      FOREIGN KEY (stock_adjustment_id) REFERENCES stock_adjustments(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- ========================
    -- SETTINGS
    -- ========================
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ========================
    -- AUDIT
    -- ========================
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- ========================
    -- INDEXES
    -- ========================
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created ON stock_movements(product_id, created_at);
  `);

  // Save after schema creation
  database._save();

  // Migrations for existing databases
  const migrations = [
    'ALTER TABLE products ADD COLUMN custom_margin REAL DEFAULT NULL',
    'ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT DEFAULT \'unpaid\'',
    'ALTER TABLE purchase_orders ADD COLUMN due_date TEXT',
    'ALTER TABLE purchase_orders ADD COLUMN paid_at TEXT',
    'CREATE TABLE IF NOT EXISTS sales_returns (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, return_number TEXT UNIQUE NOT NULL, reason TEXT, notes TEXT, total_refund REAL DEFAULT 0, status TEXT DEFAULT \'completed\', created_by TEXT, created_at TEXT, FOREIGN KEY (sale_id) REFERENCES sales(id), FOREIGN KEY (created_by) REFERENCES users(id))',
    'CREATE TABLE IF NOT EXISTS sales_return_items (id TEXT PRIMARY KEY, sales_return_id TEXT NOT NULL, sale_item_id TEXT, product_id TEXT, qty_returned INTEGER, unit_price REAL DEFAULT 0, subtotal REAL DEFAULT 0, FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id), FOREIGN KEY (product_id) REFERENCES products(id))',
  ];
  for (const sql of migrations) {
    try { database.exec(sql); } catch (e) { 
      // Only log if it's NOT the expected "duplicate column" error
      if (!e.message?.includes('duplicate column')) {
        console.warn('Migration warning:', e.message, '| SQL:', sql.substring(0, 60));
      }
    }
  }
  database._save();

  console.log('Database initialized successfully.');
}

module.exports = { getDb, initializeDatabase };
