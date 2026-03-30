const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

const router = express.Router();

const allowedRegisterTypes = ['USER', 'LOJA'];

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, type: user.type }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Cadastra um novo usuário (USER ou LOJA)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               type: { type: string, enum: [USER, LOJA] }
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, type = 'USER' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email e password são obrigatórios.' });
    }

    if (!allowedRegisterTypes.includes(type)) {
      return res.status(400).json({
        message: 'Tipo de usuário inválido para cadastro público. Use USER ou LOJA.',
      });
    }

    const alreadyExists = await User.findOne({ email: email.toLowerCase() });
    if (alreadyExists) {
      return res.status(409).json({ message: 'Email já cadastrado.' });
    }

    const user = await User.create({ name, email, password, type });
    const token = signToken(user);

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Faz login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login efetuado
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email e password são obrigatórios.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;