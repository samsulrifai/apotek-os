const request = require('supertest');
const app = require('../index');
const { setupTestDb } = require('./setup');

let testToken;

beforeAll(async () => {
  const setup = await setupTestDb();
  testToken = setup.testToken;
});

describe('Auth Routes', () => {
  test('POST /api/auth/login - should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'test123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('testadmin');
  });

  test('POST /api/auth/login - should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login - should reject missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me - should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('testadmin');
  });

  test('GET /api/auth/me - should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout - should logout successfully', async () => {
    const res = await request(app)
      .post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout berhasil.');
  });
});
