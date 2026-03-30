const request = require('supertest');

process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/app');

describe('Health route', () => {
  it('deve responder status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ status: 'ok', service: 'KudiaMap API' })
    );
  });
});