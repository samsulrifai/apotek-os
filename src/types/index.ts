// ============================================================
// Apotek Web — TypeScript Domain Types
// ============================================================

// --- Auth & Users ---
export interface User {
  id: string
  full_name: string
  email: string
  username: string
  status: 'active' | 'inactive' | 'locked'
  last_login_at: string | null
  created_at: string
  updated_at: string
  roles: Role[]
}

export interface Role {
  id: string
  name: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

// --- Master Data ---
export interface Category {
  id: string
  name: string
  description: string | null
  product_count?: number
}

export interface Unit {
  id: string
  name: string
  symbol: string
  product_count?: number
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  contact_person: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// --- Products ---
export type DrugClass = 'bebas' | 'bebas_terbatas' | 'keras' | 'narkotika' | 'psikotropika' | 'prekursor'

export const DRUG_CLASS_LABELS: Record<DrugClass, string> = {
  bebas: 'Obat Bebas',
  bebas_terbatas: 'Obat Bebas Terbatas',
  keras: 'Obat Keras',
  narkotika: 'Narkotika',
  psikotropika: 'Psikotropika',
  prekursor: 'Prekursor',
}

export const DRUG_CLASS_COLORS: Record<DrugClass, string> = {
  bebas: 'bg-green-100 text-green-800',
  bebas_terbatas: 'bg-blue-100 text-blue-800',
  keras: 'bg-red-100 text-red-800',
  narkotika: 'bg-red-200 text-red-900',
  psikotropika: 'bg-orange-100 text-orange-800',
  prekursor: 'bg-yellow-100 text-yellow-800',
}

export interface Product {
  id: string
  category_id: string
  unit_id: string
  sku: string
  barcode: string | null
  name: string
  generic_name: string | null
  form: string | null
  strength: string | null
  manufacturer: string | null
  drug_class: DrugClass
  min_stock: number
  default_purchase_price: number
  selling_price: number
  custom_margin: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  category_name?: string
  unit_name?: string
  unit_symbol?: string
  total_stock?: number
}

export interface ProductBatch {
  id: string
  product_id: string
  batch_number: string
  manufacture_date: string | null
  expiry_date: string
  purchase_price: number
  qty_on_hand: number
  qty_reserved: number
  location_code: string | null
  status: 'active' | 'expired' | 'quarantined'
  created_at: string
  updated_at: string
  // Joined
  product_name?: string
  product_sku?: string
}

export interface ProductFormData {
  name: string
  generic_name?: string
  category_id: string
  unit_id: string
  sku?: string
  barcode?: string
  form?: string
  strength?: string
  manufacturer?: string
  drug_class: DrugClass
  min_stock: number
  default_purchase_price: number
  selling_price: number
  custom_margin?: number | null
}

// --- Purchasing ---
export type POStatus = 'draft' | 'approved' | 'partial' | 'completed' | 'cancelled'

export interface PurchaseOrder {
  id: string
  supplier_id: string
  po_number: string
  order_date: string
  expected_date: string | null
  status: POStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  supplier_name?: string
  created_by_name?: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_price: number
  discount_amount: number
  tax_amount: number
  subtotal: number
  // Joined
  product_name?: string
  product_sku?: string
}

export interface GoodsReceipt {
  id: string
  purchase_order_id: string
  receipt_number: string
  received_date: string
  received_by: string
  notes: string | null
  created_at: string
  // Joined
  po_number?: string
  supplier_name?: string
  received_by_name?: string
  items?: GoodsReceiptItem[]
}

export interface GoodsReceiptItem {
  id: string
  goods_receipt_id: string
  product_id: string
  product_batch_id: string
  qty_received: number
  unit_price: number
  // Joined
  product_name?: string
  batch_number?: string
  expiry_date?: string
}

// --- Sales ---
export type SaleType = 'otc' | 'prescription'
export type SaleStatus = 'draft' | 'paid' | 'cancelled' | 'returned_partial' | 'returned_full'

export interface Sale {
  id: string
  sale_number: string
  customer_name: string | null
  cashier_id: string
  sale_type: SaleType
  status: SaleStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  change_amount: number
  payment_method: string
  notes: string | null
  sold_at: string
  created_at: string
  // Joined
  cashier_name?: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  discount_amount: number
  subtotal: number
}

export interface CartItem {
  product_id: string
  product_name: string
  sku: string
  qty: number
  unit_price: number
  selling_price: number
  discount_amount: number
  subtotal: number
  stock_available: number
  drug_class: DrugClass
}

export interface CreateSalePayload {
  items: {
    product_id: string
    qty: number
    unit_price: number
    discount_amount: number
  }[]
  payment_method: string
  paid_amount: number
  customer_name?: string
  notes?: string
  sale_type?: SaleType
}

// --- Inventory ---
export interface StockItem {
  product_id: string
  product_name: string
  sku: string
  generic_name: string | null
  category_name: string
  unit_symbol: string
  min_stock: number
  total_stock: number
  selling_price: number
  drug_class: DrugClass
  batches: ProductBatch[]
  status: 'normal' | 'low' | 'critical' | 'empty'
}

export interface StockAdjustment {
  id: string
  adjustment_number: string
  reason: string
  notes: string | null
  status: string
  created_by: string
  approved_by: string | null
  created_at: string
  created_by_name?: string
  items?: StockAdjustmentItem[]
}

export interface StockAdjustmentItem {
  id: string
  stock_adjustment_id: string
  product_id: string
  product_batch_id: string | null
  qty_before: number
  qty_after: number
  qty_difference: number
  product_name?: string
  batch_number?: string
}

export interface StockMovement {
  id: string
  product_id: string
  product_batch_id: string | null
  movement_type: string
  reference_type: string
  reference_id: string
  qty_in: number
  qty_out: number
  unit_cost: number | null
  notes: string | null
  created_by: string
  created_at: string
  product_name?: string
  batch_number?: string
}

// --- Dashboard ---
export interface DashboardSummary {
  todaySales: { count: number; total: number }
  totalProducts: number
  criticalStock: number
  expiringBatches: number
  recentTransactions: Sale[]
  salesTrend: { date: string; total: number; count: number }[]
  stockAlerts: { product_name: string; sku: string; total_stock: number; min_stock: number }[]
  expiryAlerts: { product_name: string; batch_number: string; expiry_date: string; qty_on_hand: number }[]
}

// --- Reports ---
export interface ProfitLossReport {
  period: { start: string; end: string }
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  details: {
    date: string
    revenue: number
    cogs: number
    profit: number
  }[]
}

export interface SalesReport {
  period: { start: string; end: string }
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  byCategory: { category_name: string; total: number; count: number }[]
  byPaymentMethod: { method: string; total: number; count: number }[]
  topProducts: { product_name: string; qty_sold: number; total: number }[]
  dailyTrend: { date: string; total: number; count: number }[]
}

export interface ExpiryReportItem {
  product_id: string
  product_name: string
  sku: string
  batch_number: string
  expiry_date: string
  qty_on_hand: number
  days_until_expiry: number
  status: 'expired' | 'critical' | 'warning' | 'normal'
  purchase_price: number
  potential_loss: number
}

// --- Settings ---
export interface AppSettings {
  ppn_rate: string
  default_margin: string
  pharmacy_name: string
  pharmacy_address: string
  pharmacy_phone: string
  pharmacy_email?: string
  pharmacy_license?: string
  pharmacist_name?: string
  pharmacist_license?: string
  [key: string]: string | undefined
}

// --- Invoice (derived from PO + GR) ---
export interface Invoice {
  id: string
  po_number: string
  supplier_name: string
  total_amount: number
  received_date: string
  payment_status: 'unpaid' | 'paid' | 'overdue'
  due_date: string | null
  paid_at: string | null
}

// --- API Response Wrappers ---
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  error: string
  details?: string
}
