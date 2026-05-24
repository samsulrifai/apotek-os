const { getDb, initializeDatabase } = require('./database');
const { v4: uuidv4 } = require('uuid');

const categories = [
  { name: 'Obat Bebas', description: 'Obat yang dapat dibeli tanpa resep dokter' },
  { name: 'Obat Bebas Terbatas', description: 'Obat dengan peringatan khusus' },
  { name: 'Obat Keras', description: 'Obat yang memerlukan resep dokter' },
  { name: 'Obat Herbal', description: 'Obat berbahan dasar herbal' },
  { name: 'Suplemen & Vitamin', description: 'Suplemen kesehatan dan vitamin' },
  { name: 'Alat Kesehatan', description: 'Peralatan dan perlengkapan kesehatan' },
  { name: 'Obat Generik', description: 'Obat generik berlogo' },
  { name: 'Kosmetik & Perawatan', description: 'Produk kosmetik dan perawatan tubuh' },
];

const units = [
  { name: 'Tablet', symbol: 'Tab' },
  { name: 'Kapsul', symbol: 'Kap' },
  { name: 'Botol', symbol: 'Btl' },
  { name: 'Tube', symbol: 'Tub' },
  { name: 'Ampul', symbol: 'Amp' },
  { name: 'Strip', symbol: 'Str' },
  { name: 'Box', symbol: 'Box' },
  { name: 'Sachet', symbol: 'Sac' },
  { name: 'Vial', symbol: 'Vial' },
  { name: 'Piece/Buah', symbol: 'Pcs' },
  { name: 'Pot', symbol: 'Pot' },
  { name: 'Gallon', symbol: 'Gal' },
];

const settings = [
  { key: 'ppn_rate', value: '11' },
  { key: 'default_margin', value: '15' },
  { key: 'pharmacy_name', value: 'Apotek Sehat Farma' },
  { key: 'pharmacy_address', value: 'Jl. Kesehatan No. 1' },
  { key: 'pharmacy_phone', value: '021-1234567' },
  { key: 'pharmacy_email', value: 'apotek@sehatfarma.com' },
  { key: 'pharmacy_license', value: 'SIA.xxx/2024' },
  { key: 'pharmacist_name', value: 'Apt. Dr. Ahmad' },
  { key: 'pharmacist_license', value: 'STRA.xxx/2024' },
];

async function seed() {
  try {
    await initializeDatabase();
    const db = getDb();

    console.log('Mulai seeding database...\n');

    // Seed categories
    let catInserted = 0;
    for (const cat of categories) {
      const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat.name);
      if (!existing) {
        db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)')
          .run(uuidv4(), cat.name, cat.description);
        catInserted++;
      }
    }
    console.log(`Kategori: ${catInserted} ditambahkan, ${categories.length - catInserted} sudah ada.`);

    // Seed units
    let unitInserted = 0;
    for (const unit of units) {
      const existing = db.prepare('SELECT id FROM units WHERE name = ?').get(unit.name);
      if (!existing) {
        db.prepare('INSERT INTO units (id, name, symbol) VALUES (?, ?, ?)')
          .run(uuidv4(), unit.name, unit.symbol);
        unitInserted++;
      }
    }
    console.log(`Satuan: ${unitInserted} ditambahkan, ${units.length - unitInserted} sudah ada.`);

    // Seed settings
    let settInserted = 0;
    for (const sett of settings) {
      const existing = db.prepare('SELECT id FROM app_settings WHERE key = ?').get(sett.key);
      if (!existing) {
        db.prepare('INSERT INTO app_settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), sett.key, sett.value, new Date().toISOString());
        settInserted++;
      }
    }
    console.log(`Pengaturan: ${settInserted} ditambahkan, ${settings.length - settInserted} sudah ada.`);

    // Save to disk
    db._save();

    console.log('\nSeeding selesai!');
    process.exit(0);
  } catch (err) {
    console.error('Gagal melakukan seeding:', err.message);
    process.exit(1);
  }
}

seed();
