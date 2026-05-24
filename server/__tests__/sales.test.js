const request = require('supertest');
const app = require('../index');
const { setupTestDb } = require('./setup');

let testToken;

beforeAll(async () => {
  const setup = await setupTestDb();
  testToken = setup.testToken;
});

describe('Sales Routes', () => {
  test('GET /api/sales - should list sales', async () => {
    const res = await request(app)
      .get('/api/sales')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  test('GET /api/sales/recent - should list recent sales', async () => {
    const res = await request(app)
      .get('/api/sales/recent')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/sales - should reject without token', async () => {
    const res = await request(app).get('/api/sales');
    expect(res.status).toBe(401);
  });
});

describe('Dashboard Routes', () => {
  test('GET /api/dashboard/summary - should return dashboard data', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('todaySales');
    expect(res.body).toHaveProperty('totalProducts');
    expect(res.body).toHaveProperty('criticalStock');
    expect(res.body).toHaveProperty('expiringBatches');
    expect(res.body).toHaveProperty('recentTransactions');
    expect(res.body).toHaveProperty('salesTrend');
  });
});

describe('Settings Routes', () => {
  test('GET /api/settings - should return settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });

  test('PUT /api/settings - should update settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ pharmacy_name: 'Apotek Test', tax_rate: '11' });
    expect(res.status).toBe(200);
    expect(res.body.pharmacy_name).toBe('Apotek Test');
    expect(res.body.tax_rate).toBe('11');
  });
});

describe('Report Routes', () => {
  test('GET /api/reports/sales - should return sales report', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/reports/sales?start=${today}&end=${today}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('byCategory');
    expect(res.body).toHaveProperty('topProducts');
  });

  test('GET /api/reports/sales - should reject without dates', async () => {
    const res = await request(app)
      .get('/api/reports/sales')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(400);
  });

  test('GET /api/reports/expiries - should return expiry report', async () => {
    const res = await request(app)
      .get('/api/reports/expiries')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('summary');
  });

  test('GET /api/reports/profit-loss - should return profit-loss report', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/reports/profit-loss?start=${today}&end=${today}`)
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('revenue');
    expect(res.body.summary).toHaveProperty('grossProfit');
  });
});

describe('Health Check', () => {
  test('GET /api/health - should return health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
