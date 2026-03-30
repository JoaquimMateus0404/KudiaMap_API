const dotenv = require('dotenv');

dotenv.config();

const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${varName}`);
  }
});

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};