const dotenv = require('dotenv');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Store = require('../src/models/Store');
const MenuItem = require('../src/models/MenuItem');
const Post = require('../src/models/Post');
const Review = require('../src/models/Review');
const Favorite = require('../src/models/Favorite');

dotenv.config();

const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');

const usersSeed = [
  {
    key: 'admin',
    name: 'KudiaMap Admin',
    email: 'admin@kudiamap.com',
    password: '123456',
    type: 'ADMIN',
  },
  {
    key: 'owner1',
    name: 'Burger House Owner',
    email: 'owner.burger@kudiamap.com',
    password: '123456',
    type: 'LOJA',
  },
  {
    key: 'owner2',
    name: 'Pizza City Owner',
    email: 'owner.pizza@kudiamap.com',
    password: '123456',
    type: 'LOJA',
  },
  {
    key: 'owner3',
    name: 'Grill Central Owner',
    email: 'owner.grill@kudiamap.com',
    password: '123456',
    type: 'LOJA',
  },
  {
    key: 'user1',
    name: 'Ana Silva',
    email: 'ana@kudiamap.com',
    password: '123456',
    type: 'USER',
  },
  {
    key: 'user2',
    name: 'Carlos Mendes',
    email: 'carlos@kudiamap.com',
    password: '123456',
    type: 'USER',
  },
  {
    key: 'user3',
    name: 'Joana Costa',
    email: 'joana@kudiamap.com',
    password: '123456',
    type: 'USER',
  },
  {
    key: 'user4',
    name: 'Mateus Rocha',
    email: 'mateus@kudiamap.com',
    password: '123456',
    type: 'USER',
  },
];

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não definida no .env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
};

const resetCollections = async () => {
  await Promise.all([
    Favorite.deleteMany({}),
    Review.deleteMany({}),
    Post.deleteMany({}),
    MenuItem.deleteMany({}),
    Store.deleteMany({}),
    User.deleteMany({}),
  ]);
};

const seedUsers = async () => {
  const usersByKey = {};

  for (const userData of usersSeed) {
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      type: userData.type,
    });
    usersByKey[userData.key] = user;
  }

  return usersByKey;
};

const seedStores = async (usersByKey) => {
  const stores = await Store.insertMany([
    {
      name: 'Burger House',
      description: 'Hamburgaria com foco em combos premium.',
      category: 'Hamburgueria',
      owner: usersByKey.owner1._id,
      location: { type: 'Point', coordinates: [13.2342, -8.8389] },
    },
    {
      name: 'Pizza City',
      description: 'Pizzas artesanais com entrega rápida.',
      category: 'Pizzaria',
      owner: usersByKey.owner2._id,
      location: { type: 'Point', coordinates: [13.2441, -8.8245] },
    },
    {
      name: 'Grill Central',
      description: 'Grelhados e pratos executivos.',
      category: 'Restaurante',
      owner: usersByKey.owner3._id,
      location: { type: 'Point', coordinates: [13.2178, -8.8512] },
    },
  ]);

  return {
    burgerHouse: stores[0],
    pizzaCity: stores[1],
    grillCentral: stores[2],
  };
};

const seedMenuItems = async (storesByKey) => {
  return MenuItem.insertMany([
    {
      store: storesByKey.burgerHouse._id,
      name: 'X-Burger Clássico',
      description: 'Pão brioche, carne 150g e queijo cheddar.',
      category: 'Hamburguer',
      price: 1800,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
      available: true,
    },
    {
      store: storesByKey.burgerHouse._id,
      name: 'X-Bacon Duplo',
      description: 'Dois hambúrgueres, bacon crocante e molho especial.',
      category: 'Hamburguer',
      price: 2600,
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349',
      available: true,
    },
    {
      store: storesByKey.burgerHouse._id,
      name: 'Batata Frita Média',
      description: 'Porção média de batata crocante.',
      category: 'Acompanhamento',
      price: 900,
      available: true,
    },
    {
      store: storesByKey.pizzaCity._id,
      name: 'Pizza Margherita',
      description: 'Molho de tomate, mozzarella e manjericão.',
      category: 'Pizza',
      price: 3200,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
      available: true,
    },
    {
      store: storesByKey.pizzaCity._id,
      name: 'Pizza Pepperoni',
      description: 'Queijo mozzarella e pepperoni premium.',
      category: 'Pizza',
      price: 3800,
      available: true,
    },
    {
      store: storesByKey.pizzaCity._id,
      name: 'Refrigerante 1L',
      description: 'Bebida gelada 1 litro.',
      category: 'Bebida',
      price: 700,
      available: true,
    },
    {
      store: storesByKey.grillCentral._id,
      name: 'Frango Grelhado',
      description: 'Frango grelhado com legumes salteados.',
      category: 'Prato',
      price: 2900,
      image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143',
      available: true,
    },
    {
      store: storesByKey.grillCentral._id,
      name: 'Bife à Casa',
      description: 'Bife alto com molho da casa e batatas.',
      category: 'Prato',
      price: 4200,
      available: true,
    },
    {
      store: storesByKey.grillCentral._id,
      name: 'Sumo Natural',
      description: 'Sumo natural de laranja.',
      category: 'Bebida',
      price: 1100,
      available: true,
    },
  ]);
};

const seedPosts = async (usersByKey, storesByKey) => {
  return Post.insertMany([
    {
      store: storesByKey.burgerHouse._id,
      title: 'Promo 2x1 no X-Burger',
      content: 'Hoje, na compra de um X-Burger, o segundo é grátis.',
      status: 'PUBLISHED',
      createdBy: usersByKey.owner1._id,
      moderation: {
        reviewedBy: usersByKey.admin._id,
        reviewedAt: new Date(),
        reason: 'Promoção aprovada para destaque.',
      },
      publishedAt: new Date(),
      isDeleted: false,
    },
    {
      store: storesByKey.pizzaCity._id,
      title: 'Rodízio de Sexta',
      content: 'Rodízio especial com sabores novos a partir das 18h.',
      status: 'DRAFT',
      createdBy: usersByKey.owner2._id,
      isDeleted: false,
    },
    {
      store: storesByKey.grillCentral._id,
      title: 'Menu Executivo da Semana',
      content: 'Novo menu executivo com opções low carb.',
      status: 'ARCHIVED',
      createdBy: usersByKey.owner3._id,
      moderation: {
        reviewedBy: usersByKey.admin._id,
        reviewedAt: new Date(),
        reason: 'Campanha encerrada.',
      },
      isDeleted: false,
    },
  ]);
};

const seedReviews = async (usersByKey, storesByKey) => {
  return Review.insertMany([
    {
      user: usersByKey.user1._id,
      store: storesByKey.burgerHouse._id,
      rating: 5,
      comment: 'Excelente hambúrguer e atendimento rápido.',
      date: new Date(),
    },
    {
      user: usersByKey.user2._id,
      store: storesByKey.burgerHouse._id,
      rating: 4,
      comment: 'Muito bom, preço justo para a qualidade.',
      date: new Date(),
    },
    {
      user: usersByKey.user1._id,
      store: storesByKey.pizzaCity._id,
      rating: 4,
      comment: 'Pizza saborosa, chegou quente.',
      date: new Date(),
    },
    {
      user: usersByKey.user3._id,
      store: storesByKey.grillCentral._id,
      rating: 5,
      comment: 'Pratos executivos ótimos para almoço.',
      date: new Date(),
    },
    {
      user: usersByKey.user4._id,
      store: storesByKey.pizzaCity._id,
      rating: 3,
      comment: 'Boa pizza, pode melhorar no tempo de entrega.',
      date: new Date(),
    },
  ]);
};

const seedFavorites = async (usersByKey, storesByKey) => {
  return Favorite.insertMany([
    { user: usersByKey.user1._id, store: storesByKey.burgerHouse._id },
    { user: usersByKey.user1._id, store: storesByKey.pizzaCity._id },
    { user: usersByKey.user2._id, store: storesByKey.grillCentral._id },
    { user: usersByKey.user3._id, store: storesByKey.pizzaCity._id },
    { user: usersByKey.user4._id, store: storesByKey.burgerHouse._id },
  ]);
};

const run = async () => {
  await connect();

  const hasAnyData = await User.countDocuments();
  if (hasAnyData > 0 && !shouldReset) {
    throw new Error(
      'Já existem dados no banco. Rode novamente com --reset para recriar os dados de teste.'
    );
  }

  if (shouldReset) {
    await resetCollections();
  }

  const usersByKey = await seedUsers();
  const storesByKey = await seedStores(usersByKey);
  const menuItems = await seedMenuItems(storesByKey);
  const posts = await seedPosts(usersByKey, storesByKey);
  const reviews = await seedReviews(usersByKey, storesByKey);
  const favorites = await seedFavorites(usersByKey, storesByKey);

  // eslint-disable-next-line no-console
  console.log('✅ Seed concluído com sucesso');
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        users: Object.keys(usersByKey).length,
        stores: Object.keys(storesByKey).length,
        menuItems: menuItems.length,
        posts: posts.length,
        reviews: reviews.length,
        favorites: favorites.length,
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Falha ao executar seed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });