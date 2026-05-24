require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query, queryOne, execute, initializeDatabase } = require('./database');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// DATA DEFAULT
// ============================================================

const categories = [
  { name: 'Analgesik & Antipiretik',   description: 'Obat pereda nyeri dan penurun panas (Paracetamol, Ibuprofen, Asam Mefenamat)' },
  { name: 'Antibiotik',                 description: 'Obat untuk mengatasi infeksi bakteri (Amoxicillin, Ciprofloxacin, Azithromycin)' },
  { name: 'Antasida & Tukak Lambung',  description: 'Obat maag, asam lambung, dan GERD (Omeprazole, Ranitidine, Antasida)' },
  { name: 'Antihipertensi',             description: 'Obat tekanan darah tinggi (Amlodipine, Captopril, Valsartan)' },
  { name: 'Antidiabetes',               description: 'Obat untuk penderita diabetes (Metformin, Glibenclamide, Insulin)' },
  { name: 'Vitamin & Suplemen',         description: 'Vitamin, mineral, dan suplemen kesehatan' },
  { name: 'Obat Batuk & Flu',           description: 'Obat batuk, pilek, flu, dan demam' },
  { name: 'Antihistamin & Alergi',      description: 'Obat alergi dan antihistamin (Cetirizine, Loratadine)' },
  { name: 'Antiseptik & Luka',          description: 'Obat antiseptik dan perawatan luka' },
  { name: 'Obat Mata',                  description: 'Tetes mata, salep mata, dan obat mata lainnya' },
  { name: 'Obat Kulit & Dermatologi',  description: 'Obat untuk penyakit kulit (krim antijamur, kortikosteroid topikal)' },
  { name: 'Antijamur',                  description: 'Obat untuk infeksi jamur (Fluconazole, Clotrimazole)' },
  { name: 'Kardiovaskular',             description: 'Obat jantung dan pembuluh darah' },
  { name: 'Antikolesterol',             description: 'Obat penurun kolesterol (Simvastatin, Atorvastatin)' },
  { name: 'Antidiare & Saluran Cerna', description: 'Obat diare, konstipasi, dan pencernaan' },
  { name: 'Obat Herbal & Jamu',         description: 'Produk herbal dan jamu tradisional terstandarisasi' },
  { name: 'Obat Asma & Pernapasan',    description: 'Bronkodilator dan obat asma (Salbutamol, Theophylline)' },
  { name: 'Hormon & Endokrin',          description: 'Obat hormon, tiroid, dan endokrin' },
  { name: 'Kontrasepsi',                description: 'Obat dan alat kontrasepsi' },
  { name: 'Nutrisi & MPASI',            description: 'Susu formula, nutrisi enteral, dan MPASI' },
  { name: 'Alat Kesehatan',             description: 'Tensimeter, termometer, nebulizer, masker, gloves, dll' },
  { name: 'Kosmetik Medis',             description: 'Produk perawatan kulit dan kecantikan medis' },
  { name: 'Narkotika',                  description: 'Obat golongan narkotika (pengelolaan khusus)' },
  { name: 'Psikotropika',               description: 'Obat golongan psikotropika (pengelolaan khusus)' },
];

const units = [
  { name: 'Tablet',       symbol: 'Tab'  },
  { name: 'Kapsul',       symbol: 'Kap'  },
  { name: 'Botol',        symbol: 'Btl'  },
  { name: 'Tube',         symbol: 'Tub'  },
  { name: 'Ampul',        symbol: 'Amp'  },
  { name: 'Strip',        symbol: 'Str'  },
  { name: 'Box',          symbol: 'Box'  },
  { name: 'Sachet',       symbol: 'Sac'  },
  { name: 'Vial',         symbol: 'Vial' },
  { name: 'Pcs / Buah',   symbol: 'Pcs'  },
  { name: 'Pot',          symbol: 'Pot'  },
  { name: 'Liter',        symbol: 'L'    },
  { name: 'mL',           symbol: 'mL'   },
  { name: 'Gram',         symbol: 'g'    },
  { name: 'mg',           symbol: 'mg'   },
  { name: 'Suppositoria', symbol: 'Sup'  },
  { name: 'Plester',      symbol: 'Pls'  },
  { name: 'Salep',        symbol: 'Sal'  },
  { name: 'Sirup',        symbol: 'Syr'  },
  { name: 'Tetes',        symbol: 'Tet'  },
];

const settings = [
  { key: 'pharmacy_name',      value: 'Apotek Sehat Farma'          },
  { key: 'pharmacy_address',   value: 'Jl. Kesehatan No. 1, Jakarta' },
  { key: 'pharmacy_phone',     value: '021-1234567'                  },
  { key: 'pharmacy_email',     value: 'apotek@sehatfarma.com'        },
  { key: 'pharmacy_license',   value: 'SIA.xxx/2024'                 },
  { key: 'pharmacist_name',    value: 'Apt. Dr. Ahmad, S.Farm'      },
  { key: 'pharmacist_license', value: 'STRA.xxx/2024'               },
  { key: 'ppn_rate',           value: '11'                           },
  { key: 'default_margin',     value: '20'                           },
];

// ============================================================
// SEED RUNNER
// ============================================================

async function seed() {
  try {
    await initializeDatabase();
    console.log('\n📦 Mulai seeding database Supabase...\n');

    // ── Categories ──────────────────────────────────────
    let catNew = 0, catSkip = 0;
    for (const cat of categories) {
      const existing = await queryOne('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (!existing) {
        await execute(
          'INSERT INTO categories (id, name, description) VALUES ($1, $2, $3)',
          [uuidv4(), cat.name, cat.description]
        );
        catNew++;
      } else {
        catSkip++;
      }
    }
    console.log(`✅ Kategori  : ${catNew} ditambahkan, ${catSkip} sudah ada.`);

    // ── Units ────────────────────────────────────────────
    let unitNew = 0, unitSkip = 0;
    for (const unit of units) {
      const existing = await queryOne('SELECT id FROM units WHERE name = $1', [unit.name]);
      if (!existing) {
        await execute(
          'INSERT INTO units (id, name, symbol) VALUES ($1, $2, $3)',
          [uuidv4(), unit.name, unit.symbol]
        );
        unitNew++;
      } else {
        unitSkip++;
      }
    }
    console.log(`✅ Satuan    : ${unitNew} ditambahkan, ${unitSkip} sudah ada.`);

    // ── Settings ─────────────────────────────────────────
    let settNew = 0, settSkip = 0;
    for (const sett of settings) {
      const existing = await queryOne('SELECT id FROM app_settings WHERE key = $1', [sett.key]);
      if (!existing) {
        await execute(
          'INSERT INTO app_settings (id, key, value, updated_at) VALUES ($1, $2, $3, NOW())',
          [uuidv4(), sett.key, sett.value]
        );
        settNew++;
      } else {
        settSkip++;
      }
    }
    console.log(`✅ Pengaturan: ${settNew} ditambahkan, ${settSkip} sudah ada.`);

    console.log('\n🎉 Seeding selesai!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
