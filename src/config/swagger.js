const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'KudiaMap API',
    version: '1.0.0',
    description:
      'API para cadastro de usuários/lojas, pesquisa de produtos, comparação de preços e geolocalização.',
  },
  servers: [
    {
      url: '/api',
      description: 'Base URL da API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          type: { type: 'string', enum: ['USER', 'LOJA', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Store: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          owner: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'Point' },
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                example: [13.2345, -8.8383],
              },
            },
          },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          store: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'number' },
          image: { type: 'string' },
          available: { type: 'boolean' },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJSDoc(options);