const request = require('supertest');
const app = require('../index');
const { setupTestDb } = require('./setup');

let testToken;
let createdProductId;

beforeAll(async () => {
  const setup = await setupTestDb();
  testToken = setup.testToken;
});

describe('Product Routes', () => {
  test('GET /api/products - should list products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  test('POST /api/products - should create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Paracetamol 500mg',
        generic_name: 'Paracetamol',
        drug_class: 'bebas',
        min_stock: 10,
        default_purchase_price: 5000,
        selling_price: 7500,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Paracetamol 500mg');
    createdProductId = res.body.id;
  });

  test('POST /api/products - should reject product without name', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ generic_name: 'Test' });
    expect(res.status).toBe(400);
  });

  test('GET /api/products/:id - should get product by id', async () => {
    if (!createdProductId) return;
    const res = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Paracetamol 500mg');
    expect(res.body).toHaveProperty('batches');
    expect(res.body).toHaveProperty('total_stock');
  });

  test('GET /api/products/:id - should return 404 for non-existent product', async () => {
    const res = await request(app)
      .get('/api/products/non-existent-id')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(404);
  });

  test('PUT /api/products/:id - should update product', async () => {
    if (!createdProductId) return;
    const res = await request(app)
      .put(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'Paracetamol 500mg Updated', selling_price: 8000 });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Paracetamol 500mg Updated');
  });

  test('GET /api/products/search - should search products', async () => {
    const res = await request(app)
      .get('/api/products/search?q=Paracetamol')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/products/stats - should return product stats', async () => {
    const res = await request(app)
      .get('/api/products/stats')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('active');
  });

  test('DELETE /api/products/:id - should soft-delete product', async () => {
    if (!createdProductId) return;
    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Produk berhasil dinonaktifkan.');
  });
});
