const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

const app = require('../src/app');
const User = require('../src/models/User');

describe('Auth routes', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('deve cadastrar usuário com sucesso', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Duarte',
      email: 'duarte@example.com',
      password: '123456',
      type: 'USER',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('duarte@example.com');
  });

  it('deve fazer login com sucesso', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Store Owner',
      email: 'owner@example.com',
      password: '123456',
      type: 'LOJA',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'owner@example.com',
      password: '123456',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.type).toBe('LOJA');
  });
});