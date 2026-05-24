-- Apotek OS — PostgreSQL Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================
-- AUTH TABLES
-- ========================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  full_name TEXT,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  UNIQUE(user_id, role_id)
);

-- ========================
-- MASTER TABLES
-- ========================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  symbol TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- PRODUCTS
-- ========================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  category_id TEXT REFERENCES categories(id),
  unit_id TEXT REFERENCES units(id),
  sku TEXT UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  generic_name TEXT,
  form TEXT,
  strength TEXT,
  manufacturer TEXT,
  drug_class TEXT DEFAULT 'bebas',
  min_stock INTEGER DEFAULT 0,
  default_purchase_price DOUBLE PRECISION DEFAULT 0,
  selling_price DOUBLE PRECISION DEFAULT 0,
  custom_margin DOUBLE PRECISION DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_batches (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id),
  batch_number TEXT NOT NULL,
  manufacture_date TEXT,
  expiry_date TEXT,
  purchase_price DOUBLE PRECISION DEFAULT 0,
  qty_on_hand INTEGER DEFAULT 0,
  qty_reserved INTEGER DEFAULT 0,
  location_code TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, batch_number)
);

-- ========================
-- PURCHASING
-- ========================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  supplier_id TEXT REFERENCES suppliers(id),
  po_number TEXT UNIQUE NOT NULL,
  order_date TEXT,
  expected_date TEXT,
  status TEXT DEFAULT 'draft',
  subtotal DOUBLE PRECISION DEFAULT 0,
  discount_amount DOUBLE PRECISION DEFAULT 0,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  total_amount DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  due_date TEXT,
  paid_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  product_id TEXT REFERENCES products(id),
  qty_ordered INTEGER,
  qty_received INTEGER DEFAULT 0,
  unit_price DOUBLE PRECISION DEFAULT 0,
  discount_amount DOUBLE PRECISION DEFAULT 0,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  subtotal DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  receipt_number TEXT UNIQUE NOT NULL,
  received_date TEXT,
  received_by TEXT REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  goods_receipt_id TEXT NOT NULL REFERENCES goods_receipts(id),
  product_id TEXT REFERENCES products(id),
  product_batch_id TEXT REFERENCES product_batches(id),
  qty_received INTEGER,
  unit_price DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TEXT,
  due_date TEXT,
  total_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  paid_at TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- SALES
-- ========================
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sale_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  cashier_id TEXT REFERENCES users(id),
  sale_type TEXT DEFAULT 'otc',
  status TEXT DEFAULT 'paid',
  subtotal DOUBLE PRECISION DEFAULT 0,
  discount_amount DOUBLE PRECISION DEFAULT 0,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  total_amount DOUBLE PRECISION DEFAULT 0,
  paid_amount DOUBLE PRECISION DEFAULT 0,
  change_amount DOUBLE PRECISION DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  sold_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT REFERENCES products(id),
  product_name TEXT,
  qty INTEGER,
  unit_price DOUBLE PRECISION DEFAULT 0,
  discount_amount DOUBLE PRECISION DEFAULT 0,
  subtotal DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sale_item_batches (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
  product_batch_id TEXT REFERENCES product_batches(id),
  qty INTEGER
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  return_number TEXT UNIQUE NOT NULL,
  reason TEXT,
  notes TEXT,
  total_refund DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sales_return_id TEXT NOT NULL REFERENCES sales_returns(id),
  sale_item_id TEXT,
  product_id TEXT REFERENCES products(id),
  qty_returned INTEGER,
  unit_price DOUBLE PRECISION DEFAULT 0,
  subtotal DOUBLE PRECISION DEFAULT 0
);

-- ========================
-- INVENTORY
-- ========================
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT REFERENCES products(id),
  product_batch_id TEXT,
  movement_type TEXT,
  reference_type TEXT,
  reference_id TEXT,
  qty_in INTEGER DEFAULT 0,
  qty_out INTEGER DEFAULT 0,
  unit_cost DOUBLE PRECISION,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  adjustment_number TEXT UNIQUE NOT NULL,
  reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  stock_adjustment_id TEXT NOT NULL REFERENCES stock_adjustments(id),
  product_id TEXT REFERENCES products(id),
  product_batch_id TEXT,
  qty_before INTEGER,
  qty_after INTEGER,
  qty_difference INTEGER
);

-- ========================
-- SETTINGS
-- ========================
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- AUDIT
-- ========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT REFERENCES users(id),
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created ON stock_movements(product_id, created_at);

-- ========================
-- SEED: Default admin user (password: admin123)
-- bcrypt hash of 'admin123'
-- ========================
INSERT INTO roles (id, name) VALUES ('role-admin', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES ('role-kasir', 'kasir') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, name) VALUES ('role-gudang', 'gudang') ON CONFLICT DO NOTHING;

INSERT INTO users (id, full_name, username, password_hash, status)
VALUES ('user-admin', 'Administrator', 'admin', '$2a$10$G2T9zTrZgYw1gm3aqXDwSO7AzFrrtByuy7LPEqj/mltysVdomZIn6', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (id, user_id, role_id) VALUES ('ur-1', 'user-admin', 'role-admin') ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO app_settings (id, key, value) VALUES (uuid_generate_v4()::TEXT, 'ppn_rate', '11') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (id, key, value) VALUES (uuid_generate_v4()::TEXT, 'default_margin', '15') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (id, key, value) VALUES (uuid_generate_v4()::TEXT, 'pharmacy_name', 'Apotek Sehat') ON CONFLICT (key) DO NOTHING;

-- Disable RLS on all tables for simplicity (auth handled by Express JWT middleware)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (our Express JWT handles auth)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'roles','users','user_roles','categories','units','suppliers',
    'products','product_batches','purchase_orders','purchase_order_items',
    'goods_receipts','goods_receipt_items','purchase_invoices',
    'sales','sale_items','sale_item_batches','sales_returns','sales_return_items',
    'stock_movements','stock_adjustments','stock_adjustment_items',
    'app_settings','audit_logs'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
