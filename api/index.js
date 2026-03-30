const app = require('../src/app');
const env = require('../src/config/env');
const { connectDatabase } = require('../src/config/db');

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDatabase(env.mongoUri);
      isConnected = true;
    }

    return app(req, res);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao iniciar a função serverless.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};