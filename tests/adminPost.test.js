const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

const app = require('../src/app');
const User = require('../src/models/User');
const Store = require('../src/models/Store');
const Post = require('../src/models/Post');

describe('Admin Post routes', () => {
  let mongoServer;
  let adminToken;
  let createdPostId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await User.create({
      name: 'System Admin',
      email: 'admin@kudiamap.com',
      password: '123456',
      type: 'ADMIN',
    });

    const owner = await User.create({
      name: 'Store Owner',
      email: 'owner@kudiamap.com',
      password: '123456',
      type: 'LOJA',
    });

    const store = await Store.create({
      name: 'Burger Top',
      description: 'Hamburgueria',
      category: 'Hamburguer',
      owner: owner._id,
      location: {
        type: 'Point',
        coordinates: [13.2, -8.8],
      },
    });

    const post = await Post.create({
      store: store._id,
      title: 'Promo terça',
      content: '2x1 no burger clássico',
      createdBy: owner._id,
      status: 'PUBLISHED',
    });

    createdPostId = String(post._id);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@kudiamap.com',
      password: '123456',
    });

    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('deve listar posts para admin com paginação', async () => {
    const response = await request(app)
      .get('/api/admin/posts?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.items.length).toBeGreaterThan(0);
  });

  it('deve moderar post com ação archive', async () => {
    const response = await request(app)
      .patch(`/api/admin/posts/${createdPostId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'archive', reason: 'Campanha expirada' });

    expect(response.statusCode).toBe(200);
    expect(response.body.post.status).toBe('ARCHIVED');
    expect(response.body.post.moderation.reason).toBe('Campanha expirada');
  });

  it('não deve permitir usuário não admin acessar o módulo admin', async () => {
    const userRegister = await request(app).post('/api/auth/register').send({
      name: 'Cliente',
      email: 'cliente@kudiamap.com',
      password: '123456',
      type: 'USER',
    });

    const token = userRegister.body.token;

    const response = await request(app)
      .get('/api/admin/posts')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
  });
});