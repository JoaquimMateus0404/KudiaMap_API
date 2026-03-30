const express = require('express');
const Favorite = require('../models/Favorite');
const Store = require('../models/Store');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Adiciona loja aos favoritos do usuário autenticado
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId]
 *             properties:
 *               storeId: { type: string }
 *     responses:
 *       201:
 *         description: Favorito criado
 */
router.post('/', auth(['USER', 'LOJA']), async (req, res, next) => {
  try {
    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ message: 'storeId é obrigatório.' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Loja não encontrada.' });

    const favorite = await Favorite.create({ user: req.user.id, store: storeId });
    return res.status(201).json(favorite);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Loja já está nos favoritos.' });
    }
    return next(error);
  }
});

/**
 * @swagger
 * /favorites/mine:
 *   get:
 *     summary: Lista favoritos do usuário autenticado
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de favoritos
 */
router.get('/mine', auth(['USER', 'LOJA']), async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id }).populate('store');
    return res.status(200).json(favorites);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;