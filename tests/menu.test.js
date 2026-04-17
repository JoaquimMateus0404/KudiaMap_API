const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

const app = require('../src/app');
const User = require('../src/models/User');
const Store = require('../src/models/Store');
const MenuItem = require('../src/models/MenuItem');
const Review = require('../src/models/Review');

describe('Menu routes', () => {
  let mongoServer;
  let ownerToken;
  let outsiderToken;
  let menuId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    await request(app).post('/api/auth/register').send({
      name: 'Owner',
      email: 'owner-menu@example.com',
      password: '123456',
      type: 'LOJA',
    });

    const ownerLogin = await request(app).post('/api/auth/login').send({
      email: 'owner-menu@example.com',
      password: '123456',
    });
    ownerToken = ownerLogin.body.token;

    const ownerUser = await User.findOne({ email: 'owner-menu@example.com' });
    const store = await Store.create({
      name: 'Menu Test Store',
      description: 'Store for menu tests',
      category: 'Burger',
      owner: ownerUser._id,
      location: { type: 'Point', coordinates: [13.2, -8.8] },
    });

    const item = await MenuItem.create({
      store: store._id,
      name: 'X-Burger',
      description: 'Original',
      category: 'Burger',
      price: 2000,
      available: true,
    });
    menuId = String(item._id);

    await MenuItem.create({
      store: store._id,
      name: 'Batata Frita',
      description: 'Porção média',
      category: 'Acompanhamento',
      price: 1200,
      available: true,
    });

    await Review.create({
      user: ownerUser._id,
      store: store._id,
      rating: 4,
      comment: 'Bom menu',
    });

    await request(app).post('/api/auth/register').send({
      name: 'Other Owner',
      email: 'outsider@example.com',
      password: '123456',
      type: 'LOJA',
    });

    const outsiderLogin = await request(app).post('/api/auth/login').send({
      email: 'outsider@example.com',
      password: '123456',
    });
    outsiderToken = outsiderLogin.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('deve atualizar item do menu para o dono da loja', async () => {
    const response = await request(app)
      .patch(`/api/menus/${menuId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'X-Burger Premium',
        price: 2500,
        available: false,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('X-Burger Premium');
    expect(response.body.price).toBe(2500);
    expect(response.body.available).toBe(false);
  });

  it('não deve permitir edição por outra loja', async () => {
    const response = await request(app)
      .patch(`/api/menus/${menuId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ name: 'Tentativa indevida' });

    expect(response.statusCode).toBe(403);
  });

  it('deve retornar detalhes completos no GET /menus/:id', async () => {
    const response = await request(app).get(`/api/menus/${menuId}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('menu');
    expect(response.body).toHaveProperty('store');
    expect(response.body).toHaveProperty('relatedMenus');
    expect(response.body.store).toHaveProperty('rating');
    expect(response.body.store).toHaveProperty('totalReviews');
    expect(response.body.store).toHaveProperty('stats');
  });
});