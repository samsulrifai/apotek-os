-- ============================================================
-- Apotek OS — Seed: Satuan, Kategori, & Pengaturan Default
-- Jalankan di: Supabase Dashboard → SQL Editor
-- Aman dijalankan berulang kali (ON CONFLICT DO NOTHING)
-- ============================================================

-- ========================
-- SATUAN (UNITS)
-- ========================
INSERT INTO units (id, name, symbol) VALUES
  (gen_random_uuid()::TEXT, 'Tablet',       'Tab'),
  (gen_random_uuid()::TEXT, 'Kapsul',       'Kap'),
  (gen_random_uuid()::TEXT, 'Botol',        'Btl'),
  (gen_random_uuid()::TEXT, 'Tube',         'Tub'),
  (gen_random_uuid()::TEXT, 'Ampul',        'Amp'),
  (gen_random_uuid()::TEXT, 'Strip',        'Str'),
  (gen_random_uuid()::TEXT, 'Box',          'Box'),
  (gen_random_uuid()::TEXT, 'Sachet',       'Sac'),
  (gen_random_uuid()::TEXT, 'Vial',         'Vial'),
  (gen_random_uuid()::TEXT, 'Pcs / Buah',   'Pcs'),
  (gen_random_uuid()::TEXT, 'Pot',          'Pot'),
  (gen_random_uuid()::TEXT, 'Liter',        'L'),
  (gen_random_uuid()::TEXT, 'mL',           'mL'),
  (gen_random_uuid()::TEXT, 'Gram',         'g'),
  (gen_random_uuid()::TEXT, 'mg',           'mg'),
  (gen_random_uuid()::TEXT, 'Suppositoria', 'Sup'),
  (gen_random_uuid()::TEXT, 'Plester',      'Pls'),
  (gen_random_uuid()::TEXT, 'Salep',        'Sal'),
  (gen_random_uuid()::TEXT, 'Sirup',        'Syr'),
  (gen_random_uuid()::TEXT, 'Tetes',        'Tet')
ON CONFLICT DO NOTHING;

-- ========================
-- KATEGORI OBAT (CATEGORIES)
-- ========================
INSERT INTO categories (id, name, description) VALUES
  (gen_random_uuid()::TEXT, 'Analgesik & Antipiretik',    'Obat pereda nyeri dan penurun panas (Paracetamol, Ibuprofen, Asam Mefenamat)'),
  (gen_random_uuid()::TEXT, 'Antibiotik',                  'Obat untuk mengatasi infeksi bakteri (Amoxicillin, Ciprofloxacin, Azithromycin)'),
  (gen_random_uuid()::TEXT, 'Antasida & Tukak Lambung',   'Obat maag, asam lambung, dan GERD (Omeprazole, Ranitidine, Antasida)'),
  (gen_random_uuid()::TEXT, 'Antihipertensi',              'Obat tekanan darah tinggi (Amlodipine, Captopril, Valsartan)'),
  (gen_random_uuid()::TEXT, 'Antidiabetes',                'Obat untuk penderita diabetes (Metformin, Glibenclamide, Insulin)'),
  (gen_random_uuid()::TEXT, 'Vitamin & Suplemen',          'Vitamin, mineral, dan suplemen kesehatan (Vitamin C, B-Complex, Zinc, Kalsium)'),
  (gen_random_uuid()::TEXT, 'Obat Batuk & Flu',            'Obat batuk, pilek, flu, dan demam (OBH, CTM, Pseudoephedrine)'),
  (gen_random_uuid()::TEXT, 'Antihistamin & Alergi',       'Obat alergi dan antihistamin (Cetirizine, Loratadine, Chlorpheniramine)'),
  (gen_random_uuid()::TEXT, 'Antiseptik & Luka',           'Obat antiseptik dan perawatan luka (Betadine, Rivanol, Perban)'),
  (gen_random_uuid()::TEXT, 'Obat Mata',                   'Tetes mata, salep mata, dan obat mata lainnya'),
  (gen_random_uuid()::TEXT, 'Obat Kulit & Dermatologi',   'Obat untuk penyakit kulit (krim antijamur, kortikosteroid topikal)'),
  (gen_random_uuid()::TEXT, 'Antijamur',                   'Obat untuk infeksi jamur (Fluconazole, Clotrimazole, Ketoconazole)'),
  (gen_random_uuid()::TEXT, 'Kardiovaskular',              'Obat jantung dan pembuluh darah (Digoxin, Furosemide, Atorvastatin)'),
  (gen_random_uuid()::TEXT, 'Antikolesterol',              'Obat penurun kolesterol (Simvastatin, Atorvastatin, Rosuvastatin)'),
  (gen_random_uuid()::TEXT, 'Antidiare & Saluran Cerna',  'Obat diare, konstipasi, dan pencernaan (Loperamide, Lactulose, Probiotik)'),
  (gen_random_uuid()::TEXT, 'Obat Herbal & Jamu',          'Produk herbal dan jamu tradisional terstandarisasi'),
  (gen_random_uuid()::TEXT, 'Obat Asma & Pernapasan',     'Bronkodilator dan obat asma (Salbutamol, Theophylline, Budesonide)'),
  (gen_random_uuid()::TEXT, 'Hormon & Endokrin',           'Obat hormon, tiroid, dan endokrin (Levothyroxine, Prednisone)'),
  (gen_random_uuid()::TEXT, 'Kontrasepsi',                 'Obat dan alat kontrasepsi'),
  (gen_random_uuid()::TEXT, 'Nutrisi & MPASI',             'Susu formula, nutrisi enteral, dan MPASI'),
  (gen_random_uuid()::TEXT, 'Alat Kesehatan',              'Tensimeter, termometer, nebulizer, masker, gloves, dll'),
  (gen_random_uuid()::TEXT, 'Kosmetik Medis',              'Produk perawatan kulit dan kecantikan medis'),
  (gen_random_uuid()::TEXT, 'Narkotika',                   'Obat golongan narkotika (pengelolaan khusus)'),
  (gen_random_uuid()::TEXT, 'Psikotropika',                'Obat golongan psikotropika (pengelolaan khusus)')
ON CONFLICT DO NOTHING;

-- ========================
-- PENGATURAN APOTEK (APP SETTINGS)
-- ========================
INSERT INTO app_settings (id, key, value) VALUES
  (gen_random_uuid()::TEXT, 'pharmacy_name',     'Apotek Sehat Farma'),
  (gen_random_uuid()::TEXT, 'pharmacy_address',  'Jl. Kesehatan No. 1, Jakarta'),
  (gen_random_uuid()::TEXT, 'pharmacy_phone',    '021-1234567'),
  (gen_random_uuid()::TEXT, 'pharmacy_email',    'apotek@sehatfarma.com'),
  (gen_random_uuid()::TEXT, 'pharmacy_license',  'SIA.xxx/2024'),
  (gen_random_uuid()::TEXT, 'pharmacist_name',   'Apt. Dr. Ahmad, S.Farm'),
  (gen_random_uuid()::TEXT, 'pharmacist_license','STRA.xxx/2024'),
  (gen_random_uuid()::TEXT, 'ppn_rate',          '11'),
  (gen_random_uuid()::TEXT, 'default_margin',    '20')
ON CONFLICT (key) DO NOTHING;

-- ========================
-- VERIFIKASI
-- ========================
SELECT 'units'      AS tabel, COUNT(*) AS total FROM units
UNION ALL
SELECT 'categories' AS tabel, COUNT(*) AS total FROM categories
UNION ALL
SELECT 'settings'   AS tabel, COUNT(*) AS total FROM app_settings;
