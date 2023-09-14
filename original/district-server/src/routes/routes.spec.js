const supertest = require('supertest');
const { getTestApp } = require('../app');

describe('endpoints', () => {
  test('can check health', async () => {
    const app = await getTestApp();
    const response = await supertest(app).get('/health-check');
    expect(response.res.text).toBe('ok');
  }, 5000);
});
