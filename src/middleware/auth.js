const jwt = require('jsonwebtoken');
const env = require('../config/env');

const auth = (requiredTypes = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload;

    if (requiredTypes.length > 0 && !requiredTypes.includes(payload.type)) {
      return res.status(403).json({ message: 'Acesso negado para este perfil.' });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = auth;