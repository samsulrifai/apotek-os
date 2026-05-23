const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDb, initializeDatabase } = require('./database');

// ============================================================
// SEED DATA
// ============================================================

const ROLES = ['Owner', 'Admin', 'Apoteker', 'Kasir', 'Gudang', 'Purchasing'];

const USERS = [
  { username: 'admin', password: 'admin123', full_name: 'Administrator', email: 'admin@apoteksehat.com', role: 'Admin' },
  { username: 'kasir', password: 'kasir123', full_name: 'Siti Kasir', email: 'kasir@apoteksehat.com', role: 'Kasir' },
  { username: 'apoteker', password: 'apoteker123', full_name: 'Dr. Budi Apoteker', email: 'apoteker@apoteksehat.com', role: 'Apoteker' },
  { username: 'gudang', password: 'gudang123', full_name: 'Andi Gudang', email: 'gudang@apoteksehat.com', role: 'Gudang' },
  { username: 'purchasing', password: 'purchasing123', full_name: 'Dewi Purchasing', email: 'purchasing@apoteksehat.com', role: 'Purchasing' }
];

const CATEGORIES = [
  { name: 'Analgesik & Antipiretik', description: 'Obat pereda nyeri dan penurun panas' },
  { name: 'Antibiotik', description: 'Obat untuk infeksi bakteri' },
  { name: 'Antasida & Antiulkus', description: 'Obat maag dan asam lambung' },
  { name: 'Antihipertensi', description: 'Obat tekanan darah tinggi' },
  { name: 'Antidiabetes', description: 'Obat untuk diabetes' },
  { name: 'Vitamin & Suplemen', description: 'Vitamin dan suplemen kesehatan' },
  { name: 'Obat Batuk & Flu', description: 'Obat batuk, pilek, dan flu' },
  { name: 'Antiseptik & Luka', description: 'Obat antiseptik dan perawatan luka' },
  { name: 'Obat Mata', description: 'Obat tetes mata dan salep mata' },
  { name: 'Obat Kulit', description: 'Obat untuk penyakit kulit' }
];

const UNITS = [
  { name: 'Tablet', symbol: 'Tab' },
  { name: 'Kapsul', symbol: 'Kap' },
  { name: 'Botol', symbol: 'Btl' },
  { name: 'Tube', symbol: 'Tube' },
  { name: 'Strip', symbol: 'Strip' },
  { name: 'Box', symbol: 'Box' },
  { name: 'Sachet', symbol: 'Sach' },
  { name: 'Ampul', symbol: 'Amp' }
];

const SUPPLIERS = [
  { name: 'PT Enseval Putera Megatrading Tbk', phone: '021-5401248', email: 'order@enseval.com', address: 'Jl. Pulo Lentut No. 10, Jakarta Timur', contact_person: 'Budi Santoso' },
  { name: 'PT Anugerah Pharmindo Lestari', phone: '021-5695777', email: 'order@apl.co.id', address: 'Jl. Rawa Gelam V No. 1, Jakarta Timur', contact_person: 'Rina Wati' },
  { name: 'PT Kimia Farma Trading & Distribution', phone: '021-4287070', email: 'order@kftd.co.id', address: 'Jl. Budi Utomo No. 1, Jakarta Pusat', contact_person: 'Hendra Wijaya' },
  { name: 'PT Mensa Binasukses', phone: '021-4604808', email: 'order@mensa.co.id', address: 'Jl. Raya Bekasi Km. 25, Bekasi', contact_person: 'Agus Pratama' },
  { name: 'PT Kebayoran Pharma', phone: '021-7245152', email: 'order@kebayoranpharma.com', address: 'Jl. RS Fatmawati No. 15, Jakarta Selatan', contact_person: 'Sari Dewi' },
  { name: 'PT Bina San Prima', phone: '021-6330860', email: 'order@bsp.co.id', address: 'Jl. Rawa Gelam III No. 2, Jakarta Timur', contact_person: 'Tommy Lim' },
  { name: 'PT Merapi Utama Pharma', phone: '021-46834012', email: 'order@merapi.co.id', address: 'Jl. Pulo Kambing II No. 26, Jakarta Timur', contact_person: 'Dian Sari' },
  { name: 'PT Indofarma Global Medika', phone: '021-8834750', email: 'order@igm.co.id', address: 'Jl. Indofarma No. 1, Cikarang, Bekasi', contact_person: 'Rudi Hartono' },
  { name: 'PT Parit Padang Global', phone: '021-6285866', email: 'order@ppg.co.id', address: 'Jl. Tanah Abang III No. 14, Jakarta Pusat', contact_person: 'Linda Susanti' },
  { name: 'PT Dos Ni Roha', phone: '021-4608550', email: 'order@dnr.co.id', address: 'Jl. Rawa Sumur II Blok BB No. 10, Jakarta Timur', contact_person: 'Mario Siahaan' }
];

// Hardcoded fallback products for Indonesian pharmacy
function getHardcodedProducts(categoryMap, unitMap) {
  return [
    { name: 'Paracetamol 500mg', generic_name: 'Paracetamol', form: 'Tablet', strength: '500mg', manufacturer: 'PT Kimia Farma', drug_class: 'bebas', category: 'Analgesik & Antipiretik', unit: 'Tablet', selling_price: 3500, sku: 'OBT-001' },
    { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', form: 'Kapsul', strength: '500mg', manufacturer: 'PT Sanbe Farma', drug_class: 'keras', category: 'Antibiotik', unit: 'Kapsul', selling_price: 8500, sku: 'OBT-002' },
    { name: 'Ambroxol 30mg', generic_name: 'Ambroxol HCl', form: 'Tablet', strength: '30mg', manufacturer: 'PT Bernofarm', drug_class: 'bebas_terbatas', category: 'Obat Batuk & Flu', unit: 'Tablet', selling_price: 4000, sku: 'OBT-003' },
    { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', form: 'Kapsul', strength: '20mg', manufacturer: 'PT Dexa Medica', drug_class: 'keras', category: 'Antasida & Antiulkus', unit: 'Kapsul', selling_price: 12000, sku: 'OBT-004' },
    { name: 'Vitamin C 500mg', generic_name: 'Ascorbic Acid', form: 'Tablet', strength: '500mg', manufacturer: 'PT Kimia Farma', drug_class: 'bebas', category: 'Vitamin & Suplemen', unit: 'Tablet', selling_price: 5000, sku: 'OBT-005' },
    { name: 'Cetirizine 10mg', generic_name: 'Cetirizine HCl', form: 'Tablet', strength: '10mg', manufacturer: 'PT Bernofarm', drug_class: 'bebas_terbatas', category: 'Obat Batuk & Flu', unit: 'Tablet', selling_price: 6000, sku: 'OBT-006' },
    { name: 'Metformin 500mg', generic_name: 'Metformin HCl', form: 'Tablet', strength: '500mg', manufacturer: 'PT Dexa Medica', drug_class: 'keras', category: 'Antidiabetes', unit: 'Tablet', selling_price: 7500, sku: 'OBT-007' },
    { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', form: 'Tablet', strength: '5mg', manufacturer: 'PT Kimia Farma', drug_class: 'keras', category: 'Antihipertensi', unit: 'Tablet', selling_price: 9000, sku: 'OBT-008' },
    { name: 'Captopril 25mg', generic_name: 'Captopril', form: 'Tablet', strength: '25mg', manufacturer: 'PT Indofarma', drug_class: 'keras', category: 'Antihipertensi', unit: 'Tablet', selling_price: 5500, sku: 'OBT-009' },
    { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', form: 'Tablet', strength: '400mg', manufacturer: 'PT Sanbe Farma', drug_class: 'bebas_terbatas', category: 'Analgesik & Antipiretik', unit: 'Tablet', selling_price: 6500, sku: 'OBT-010' },
    { name: 'Ranitidine 150mg', generic_name: 'Ranitidine HCl', form: 'Tablet', strength: '150mg', manufacturer: 'PT Bernofarm', drug_class: 'keras', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 8000, sku: 'OBT-011' },
    { name: 'Dexamethasone 0.5mg', generic_name: 'Dexamethasone', form: 'Tablet', strength: '0.5mg', manufacturer: 'PT Kimia Farma', drug_class: 'keras', category: 'Analgesik & Antipiretik', unit: 'Tablet', selling_price: 4500, sku: 'OBT-012' },
    { name: 'Loratadine 10mg', generic_name: 'Loratadine', form: 'Tablet', strength: '10mg', manufacturer: 'PT Dexa Medica', drug_class: 'bebas_terbatas', category: 'Obat Batuk & Flu', unit: 'Tablet', selling_price: 7000, sku: 'OBT-013' },
    { name: 'Salbutamol 4mg', generic_name: 'Salbutamol Sulfate', form: 'Tablet', strength: '4mg', manufacturer: 'PT Indofarma', drug_class: 'keras', category: 'Obat Batuk & Flu', unit: 'Tablet', selling_price: 5000, sku: 'OBT-014' },
    { name: 'Mefenamic Acid 500mg', generic_name: 'Asam Mefenamat', form: 'Kapsul', strength: '500mg', manufacturer: 'PT Kimia Farma', drug_class: 'keras', category: 'Analgesik & Antipiretik', unit: 'Kapsul', selling_price: 7500, sku: 'OBT-015' },
    { name: 'Ciprofloxacin 500mg', generic_name: 'Ciprofloxacin HCl', form: 'Tablet', strength: '500mg', manufacturer: 'PT Sanbe Farma', drug_class: 'keras', category: 'Antibiotik', unit: 'Tablet', selling_price: 11000, sku: 'OBT-016' },
    { name: 'Loperamide 2mg', generic_name: 'Loperamide HCl', form: 'Tablet', strength: '2mg', manufacturer: 'PT Bernofarm', drug_class: 'bebas_terbatas', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 5500, sku: 'OBT-017' },
    { name: 'Antacida DOEN', generic_name: 'Aluminium Hydroxide + Magnesium Hydroxide', form: 'Tablet', strength: '400mg', manufacturer: 'PT Indofarma', drug_class: 'bebas', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 3000, sku: 'OBT-018' },
    { name: 'Betadine Solution 30ml', generic_name: 'Povidone Iodine', form: 'Larutan', strength: '10%', manufacturer: 'PT Mundipharma', drug_class: 'bebas', category: 'Antiseptik & Luka', unit: 'Botol', selling_price: 25000, sku: 'OBT-019' },
    { name: 'Bioplacenton Gel 15g', generic_name: 'Neomycin + Placenta Extract', form: 'Gel', strength: '15g', manufacturer: 'PT Kalbe Farma', drug_class: 'bebas_terbatas', category: 'Antiseptik & Luka', unit: 'Tube', selling_price: 32000, sku: 'OBT-020' },
    { name: 'Gentamicin Cream 0.1%', generic_name: 'Gentamicin Sulfate', form: 'Krim', strength: '0.1%', manufacturer: 'PT Kimia Farma', drug_class: 'keras', category: 'Obat Kulit', unit: 'Tube', selling_price: 18000, sku: 'OBT-021' },
    { name: 'OBH Combi Batuk Plus', generic_name: 'Dextromethorphan + Guaifenesin', form: 'Sirup', strength: '60ml', manufacturer: 'PT Combiphar', drug_class: 'bebas_terbatas', category: 'Obat Batuk & Flu', unit: 'Botol', selling_price: 22000, sku: 'OBT-022' },
    { name: 'Promag Tablet', generic_name: 'Hydrotalcite + Magnesium Hydroxide', form: 'Tablet', strength: '200mg', manufacturer: 'PT Kalbe Farma', drug_class: 'bebas', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 4000, sku: 'OBT-023' },
    { name: 'Dulcolax 5mg', generic_name: 'Bisacodyl', form: 'Tablet', strength: '5mg', manufacturer: 'PT Boehringer', drug_class: 'bebas_terbatas', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 12000, sku: 'OBT-024' },
    { name: 'Lipitor 20mg', generic_name: 'Atorvastatin Calcium', form: 'Tablet', strength: '20mg', manufacturer: 'PT Pfizer Indonesia', drug_class: 'keras', category: 'Antihipertensi', unit: 'Tablet', selling_price: 145000, sku: 'OBT-025' },
    { name: 'Glucophage 500mg', generic_name: 'Metformin HCl', form: 'Tablet', strength: '500mg', manufacturer: 'PT Merck Indonesia', drug_class: 'keras', category: 'Antidiabetes', unit: 'Tablet', selling_price: 15000, sku: 'OBT-026' },
    { name: 'Cataflam 50mg', generic_name: 'Diclofenac Potassium', form: 'Tablet', strength: '50mg', manufacturer: 'PT Novartis Indonesia', drug_class: 'keras', category: 'Analgesik & Antipiretik', unit: 'Tablet', selling_price: 18000, sku: 'OBT-027' },
    { name: 'Neurobion Forte', generic_name: 'Vitamin B1 + B6 + B12', form: 'Tablet', strength: 'Forte', manufacturer: 'PT Merck Indonesia', drug_class: 'bebas', category: 'Vitamin & Suplemen', unit: 'Tablet', selling_price: 8500, sku: 'OBT-028' },
    { name: 'Sangobion Kapsul', generic_name: 'Ferrous Gluconate + Folic Acid', form: 'Kapsul', strength: '250mg', manufacturer: 'PT Merck Indonesia', drug_class: 'bebas', category: 'Vitamin & Suplemen', unit: 'Kapsul', selling_price: 9500, sku: 'OBT-029' },
    { name: 'Diatabs 600mg', generic_name: 'Attapulgite', form: 'Tablet', strength: '600mg', manufacturer: 'PT Medifarma', drug_class: 'bebas', category: 'Antasida & Antiulkus', unit: 'Tablet', selling_price: 6000, sku: 'OBT-030' }
  ].map(p => ({
    ...p,
    category_id: categoryMap[p.category] || null,
    unit_id: unitMap[p.unit] || null,
    default_purchase_price: Math.round(p.selling_price * (0.6 + Math.random() * 0.2)), // 60-80% of selling price
    min_stock: Math.floor(Math.random() * 30) + 10
  }));
}

async function fetchOpenFDAProducts(categoryMap, unitMap) {
  try {
    console.log('Fetching drug data from openFDA API...');
    const response = await fetch('https://api.fda.gov/drug/ndc.json?search=dosage_form:"TABLET"+AND+route:"ORAL"&limit=30');

    if (!response.ok) {
      throw new Error(`openFDA API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No results from openFDA');
    }

    console.log(`Received ${data.results.length} products from openFDA. Mapping to local format...`);

    // Use openFDA data to enhance names but keep Indonesian pricing/classification
    const hardcoded = getHardcodedProducts(categoryMap, unitMap);

    // Merge FDA brand names into our products where applicable
    const merged = hardcoded.map((product, idx) => {
      const fdaItem = data.results[idx];
      if (fdaItem && fdaItem.brand_name) {
        // Keep our product but note the FDA brand
        return {
          ...product,
          barcode: fdaItem.product_ndc ? fdaItem.product_ndc.replace(/-/g, '') : null
        };
      }
      return product;
    });

    console.log('Successfully merged openFDA data with local product catalog.');
    return merged;
  } catch (err) {
    console.warn(`openFDA API fetch failed: ${err.message}. Using hardcoded fallback.`);
    return getHardcodedProducts(categoryMap, unitMap);
  }
}

function generateBatches(productId, purchasePrice, now) {
  const batches = [];
  const batchCount = 2 + Math.floor(Math.random() * 2); // 2-3 batches

  for (let i = 0; i < batchCount; i++) {
    const batchNum = `B${String(Date.now()).slice(-6)}${String(i + 1).padStart(2, '0')}`;

    // Manufacture date: 1-12 months ago
    const mfgMonthsAgo = Math.floor(Math.random() * 12) + 1;
    const mfgDate = new Date(now);
    mfgDate.setMonth(mfgDate.getMonth() - mfgMonthsAgo);

    // Expiry date: some near-expiry (within 90 days), most 1-3 years out
    const expiryDate = new Date(now);
    if (i === 0 && Math.random() > 0.5) {
      // Near-expiry batch for alerts
      expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 60) + 10);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 24) + 6);
    }

    batches.push({
      id: uuidv4(),
      product_id: productId,
      batch_number: batchNum,
      manufacture_date: mfgDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      purchase_price: purchasePrice,
      qty_on_hand: Math.floor(Math.random() * 80) + 20,
      status: 'active'
    });
  }

  return batches;
}

function dateOffset(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function seed() {
  console.log('============================================');
  console.log('  Apotek Web - Database Seeding');
  console.log('============================================\n');

  await initializeDatabase();
  const db = getDb();
  const now = new Date();
  const nowISO = now.toISOString();

  // ---- CLEAR ALL DATA ----
  console.log('Clearing existing data...');
  const tables = [
    'audit_logs', 'app_settings',
    'stock_adjustment_items', 'stock_adjustments', 'stock_movements',
    'sale_item_batches', 'sale_items', 'sales',
    'goods_receipt_items', 'goods_receipts',
    'purchase_order_items', 'purchase_orders',
    'product_batches', 'products',
    'suppliers', 'units', 'categories',
    'user_roles', 'users', 'roles'
  ];
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  console.log('All tables cleared.\n');

  // ---- ROLES ----
  console.log('Creating roles...');
  const roleMap = {};
  for (const roleName of ROLES) {
    const id = uuidv4();
    db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)').run(id, roleName);
    roleMap[roleName] = id;
  }
  console.log(`  Created ${ROLES.length} roles.\n`);

  // ---- USERS ----
  console.log('Creating users...');
  const userMap = {};
  for (const u of USERS) {
    const id = uuidv4();
    const hash = bcrypt.hashSync(u.password, 10);
    db.prepare(`
      INSERT INTO users (id, full_name, email, username, password_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(id, u.full_name, u.email, u.username, hash, nowISO, nowISO);

    const roleId = roleMap[u.role];
    if (roleId) {
      db.prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(uuidv4(), id, roleId);
    }
    userMap[u.username] = id;
  }
  console.log(`  Created ${USERS.length} users.\n`);

  // ---- CATEGORIES ----
  console.log('Creating categories...');
  const categoryMap = {};
  for (const cat of CATEGORIES) {
    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)').run(id, cat.name, cat.description);
    categoryMap[cat.name] = id;
  }
  console.log(`  Created ${CATEGORIES.length} categories.\n`);

  // ---- UNITS ----
  console.log('Creating units...');
  const unitMap = {};
  for (const unit of UNITS) {
    const id = uuidv4();
    db.prepare('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)').run(id, unit.name, unit.symbol);
    unitMap[unit.name] = id;
  }
  console.log(`  Created ${UNITS.length} units.\n`);

  // ---- SUPPLIERS ----
  console.log('Creating suppliers...');
  const supplierIds = [];
  for (const sup of SUPPLIERS) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, email, address, contact_person, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, sup.name, sup.phone, sup.email, sup.address, sup.contact_person, nowISO, nowISO);
    supplierIds.push(id);
  }
  console.log(`  Created ${SUPPLIERS.length} suppliers.\n`);

  // ---- PRODUCTS ----
  console.log('Creating products...');
  const products = await fetchOpenFDAProducts(categoryMap, unitMap);
  const productIds = [];
  const productMap = {};

  for (const p of products) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, category_id, unit_id, sku, barcode, name, generic_name, form, strength, manufacturer, drug_class, min_stock, default_purchase_price, selling_price, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, p.category_id, p.unit_id, p.sku, p.barcode || null, p.name, p.generic_name, p.form, p.strength, p.manufacturer, p.drug_class, p.min_stock, p.default_purchase_price, p.selling_price, nowISO, nowISO);

    productIds.push(id);
    productMap[id] = p;
  }
  console.log(`  Created ${products.length} products.\n`);

  // ---- PRODUCT BATCHES ----
  console.log('Creating product batches...');
  const allBatches = [];
  for (const pid of productIds) {
    const p = productMap[pid];
    const batches = generateBatches(pid, p.default_purchase_price, now);
    for (const b of batches) {
      db.prepare(`
        INSERT INTO product_batches (id, product_id, batch_number, manufacture_date, expiry_date, purchase_price, qty_on_hand, qty_reserved, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(b.id, b.product_id, b.batch_number, b.manufacture_date, b.expiry_date, b.purchase_price, b.qty_on_hand, b.status, nowISO, nowISO);
      allBatches.push(b);
    }
  }
  console.log(`  Created ${allBatches.length} product batches.\n`);

  // ---- PURCHASE ORDERS ----
  console.log('Creating purchase orders...');
  const poStatuses = ['draft', 'approved', 'completed', 'completed', 'partial'];
  const poIds = [];
  for (let i = 0; i < 5; i++) {
    const poId = uuidv4();
    const poDate = dateOffset(now, -(30 - i * 5));
    const poNumber = `PO-${poDate.split('T')[0].replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`;

    // Pick 3-5 random products for each PO
    const itemCount = 3 + Math.floor(Math.random() * 3);
    const poProducts = [];
    for (let j = 0; j < itemCount; j++) {
      const pIdx = (i * 3 + j) % productIds.length;
      poProducts.push(productIds[pIdx]);
    }

    let subtotal = 0;
    const poItems = poProducts.map(pid => {
      const p = productMap[pid];
      const qty = Math.floor(Math.random() * 50) + 20;
      const price = p.default_purchase_price;
      const itemTotal = qty * price;
      subtotal += itemTotal;
      return { id: uuidv4(), product_id: pid, qty_ordered: qty, qty_received: poStatuses[i] === 'completed' ? qty : (poStatuses[i] === 'partial' ? Math.floor(qty / 2) : 0), unit_price: price, subtotal: itemTotal };
    });

    const taxAmount = Math.round(subtotal * 0.11);
    const totalAmount = subtotal + taxAmount;

    db.prepare(`
      INSERT INTO purchase_orders (id, supplier_id, po_number, order_date, expected_date, status, subtotal, discount_amount, tax_amount, total_amount, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `).run(poId, supplierIds[i % supplierIds.length], poNumber, poDate, dateOffset(new Date(poDate), 7), poStatuses[i], subtotal, taxAmount, totalAmount, `Purchase Order #${i + 1}`, userMap['purchasing'], poDate, poDate);

    for (const item of poItems) {
      db.prepare(`
        INSERT INTO purchase_order_items (id, purchase_order_id, product_id, qty_ordered, qty_received, unit_price, discount_amount, tax_amount, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
      `).run(item.id, poId, item.product_id, item.qty_ordered, item.qty_received, item.unit_price, item.subtotal);
    }

    poIds.push({ id: poId, items: poItems, status: poStatuses[i] });
  }
  console.log(`  Created 5 purchase orders.\n`);

  // ---- GOODS RECEIPTS ----
  console.log('Creating goods receipts...');
  let grCount = 0;
  for (const po of poIds) {
    if (po.status === 'completed' || po.status === 'partial') {
      const grId = uuidv4();
      const grDate = dateOffset(now, -(25 - grCount * 5));
      const grNumber = `GR-${grDate.split('T')[0].replace(/-/g, '')}-${String(grCount + 1).padStart(4, '0')}`;

      db.prepare(`
        INSERT INTO goods_receipts (id, purchase_order_id, receipt_number, received_date, received_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(grId, po.id, grNumber, grDate, userMap['gudang'], `Penerimaan barang PO`, grDate);

      for (const item of po.items) {
        if (item.qty_received > 0) {
          // Find a batch for this product
          const batch = allBatches.find(b => b.product_id === item.product_id);
          if (batch) {
            db.prepare(`
              INSERT INTO goods_receipt_items (id, goods_receipt_id, product_id, product_batch_id, qty_received, unit_price)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), grId, item.product_id, batch.id, item.qty_received, item.unit_price);

            // Stock movement for receipt
            db.prepare(`
              INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at)
              VALUES (?, ?, ?, 'purchase_receipt', 'goods_receipt', ?, ?, 0, ?, ?, ?, ?)
            `).run(uuidv4(), item.product_id, batch.id, grId, item.qty_received, item.unit_price, `Penerimaan: ${grNumber}`, userMap['gudang'], grDate);
          }
        }
      }
      grCount++;
      if (grCount >= 3) break;
    }
  }
  console.log(`  Created ${grCount} goods receipts.\n`);

  // ---- SALES ----
  console.log('Creating sales transactions...');
  const paymentMethods = ['cash', 'cash', 'cash', 'debit', 'credit', 'qris'];
  const customerNames = ['Tn. Ahmad', 'Ny. Siti', 'Tn. Budi', null, 'Ny. Dewi', null, 'Tn. Rudi', null, 'Ny. Lina', null, 'Tn. Eko', null, 'Ny. Maya', 'Tn. Dodi', null];

  for (let i = 0; i < 15; i++) {
    const saleId = uuidv4();
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = dateOffset(now, -daysAgo);
    const dateStr = saleDate.split('T')[0].replace(/-/g, '');
    const saleNumber = `TRX-${dateStr}-${String(i + 1).padStart(4, '0')}`;

    // 1-4 items per sale
    const itemCount = 1 + Math.floor(Math.random() * 4);
    let subtotal = 0;
    let totalDiscount = 0;
    const saleItems = [];

    for (let j = 0; j < itemCount; j++) {
      const pIdx = Math.floor(Math.random() * productIds.length);
      const pid = productIds[pIdx];
      const p = productMap[pid];

      // Skip restricted drugs for OTC sales
      if (['keras', 'narkotika', 'psikotropika'].includes(p.drug_class)) {
        continue;
      }

      const qty = 1 + Math.floor(Math.random() * 5);
      const unitPrice = p.selling_price;
      const discount = Math.random() > 0.7 ? Math.round(unitPrice * qty * 0.05) : 0;
      const itemSubtotal = (unitPrice * qty) - discount;

      subtotal += unitPrice * qty;
      totalDiscount += discount;

      saleItems.push({
        id: uuidv4(),
        product_id: pid,
        product_name: p.name,
        qty,
        unit_price: unitPrice,
        discount_amount: discount,
        subtotal: itemSubtotal
      });
    }

    if (saleItems.length === 0) continue;

    const totalAmount = subtotal - totalDiscount;
    const paidAmount = Math.ceil(totalAmount / 1000) * 1000; // Round up to nearest 1000
    const changeAmount = paidAmount - totalAmount;
    const payMethod = paymentMethods[i % paymentMethods.length];

    db.prepare(`
      INSERT INTO sales (id, sale_number, customer_name, cashier_id, sale_type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount, payment_method, notes, sold_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'otc', 'paid', ?, ?, 0, ?, ?, ?, ?, NULL, ?, ?, ?)
    `).run(saleId, saleNumber, customerNames[i] || null, userMap['kasir'], subtotal, totalDiscount, totalAmount, paidAmount, changeAmount, payMethod, saleDate, saleDate, saleDate);

    for (const item of saleItems) {
      db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, qty, unit_price, discount_amount, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.id, saleId, item.product_id, item.product_name, item.qty, item.unit_price, item.discount_amount, item.subtotal);

      // FEFO batch allocation for seed data
      const batches = allBatches
        .filter(b => b.product_id === item.product_id && b.qty_on_hand > 0)
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

      let remaining = item.qty;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const allocQty = Math.min(remaining, batch.qty_on_hand);

        db.prepare(`
          INSERT INTO sale_item_batches (id, sale_item_id, product_batch_id, qty)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), item.id, batch.id, allocQty);

        // Deduct from batch in memory (for subsequent allocations in seed)
        batch.qty_on_hand -= allocQty;

        // Update batch in DB
        db.prepare('UPDATE product_batches SET qty_on_hand = qty_on_hand - ? WHERE id = ?').run(allocQty, batch.id);

        // Stock movement
        db.prepare(`
          INSERT INTO stock_movements (id, product_id, product_batch_id, movement_type, reference_type, reference_id, qty_in, qty_out, unit_cost, notes, created_by, created_at)
          VALUES (?, ?, ?, 'sale', 'sale', ?, 0, ?, ?, ?, ?, ?)
        `).run(uuidv4(), item.product_id, batch.id, saleId, allocQty, batch.purchase_price, `Penjualan: ${saleNumber}`, userMap['kasir'], saleDate);

        remaining -= allocQty;
      }
    }
  }
  console.log('  Created 15 sales transactions.\n');

  // ---- APP SETTINGS ----
  console.log('Creating app settings...');
  const settings = {
    ppn_rate: '11',
    default_margin: '25',
    pharmacy_name: 'Apotek Sehat Farma',
    pharmacy_address: 'Jl. Kesehatan No. 123, Jakarta',
    pharmacy_phone: '021-12345678',
    pharmacy_email: 'info@apoteksehat.com',
    receipt_footer: 'Terima kasih atas kunjungan Anda. Semoga lekas sembuh!',
    currency: 'IDR'
  };

  for (const [key, value] of Object.entries(settings)) {
    db.prepare('INSERT INTO app_settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)').run(uuidv4(), key, value, nowISO);
  }
  console.log(`  Created ${Object.keys(settings).length} settings.\n`);

  // Save the database to disk
  db._save();

  // ---- DONE ----
  console.log('============================================');
  console.log('  Seeding completed successfully!');
  console.log('============================================');
  console.log('\n  Login credentials:');
  console.log('  ┌─────────────┬───────────────┬──────────────┐');
  console.log('  │ Username    │ Password      │ Role         │');
  console.log('  ├─────────────┼───────────────┼──────────────┤');
  for (const u of USERS) {
    console.log(`  │ ${u.username.padEnd(11)} │ ${u.password.padEnd(13)} │ ${u.role.padEnd(12)} │`);
  }
  console.log('  └─────────────┴───────────────┴──────────────┘\n');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
