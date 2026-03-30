const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/db');

const bootstrap = async () => {
  await connectDatabase(env.mongoUri);
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`KudiaMap API rodando em http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`Swagger em http://localhost:${env.port}/api/docs`);
  });
};

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Erro ao iniciar servidor:', error);
  process.exit(1);
});