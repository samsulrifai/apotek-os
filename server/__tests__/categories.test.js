const request = require('supertest');
const app = require('../index');
const { setupTestDb } = require('./setup');

let testToken;
let createdCategoryId;

beforeAll(async () => {
  const setup = await setupTestDb();
  testToken = setup.testToken;
});

describe('Category Routes', () => {
  test('GET /api/categories - should list categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/categories - should create category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'Test Category', description: 'For testing' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test Category');
    createdCategoryId = res.body.id;
  });

  test('POST /api/categories - should reject category without name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ description: 'Missing name' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/categories/:id - should update category', async () => {
    if (!createdCategoryId) return;
    const res = await request(app)
      .put(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'Updated Category' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Category');
  });

  test('PUT /api/categories/:id - should return 404 for non-existent category', async () => {
    const res = await request(app)
      .put('/api/categories/non-existent-id')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ name: 'Something' });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/categories/:id - should delete category', async () => {
    if (!createdCategoryId) return;
    const res = await request(app)
      .delete(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Kategori berhasil dihapus.');
  });

  test('DELETE /api/categories/:id - should return 404 for non-existent', async () => {
    const res = await request(app)
      .delete('/api/categories/non-existent-id')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(404);
  });
});
