const express = require('express');
const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Store = require('../models/Store');
const Review = require('../models/Review');
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

    const storeIds = favorites
      .map((favorite) => favorite.store?._id)
      .filter(Boolean)
      .map((id) => new mongoose.Types.ObjectId(id));

    const ratings =
      storeIds.length > 0
        ? await Review.aggregate([
            {
              $match: {
                store: { $in: storeIds },
              },
            },
            {
              $group: {
                _id: '$store',
                avgRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
              },
            },
          ])
        : [];

    const ratingMap = new Map(
      ratings.map((entry) => [
        String(entry._id),
        {
          rating: Number(entry.avgRating.toFixed(1)),
          totalReviews: entry.totalReviews,
        },
      ])
    );

    const payload = favorites.map((favorite) => {
      const favoriteObj = favorite.toObject();

      if (!favoriteObj.store) {
        return favoriteObj;
      }

      const storeKey = String(favoriteObj.store._id);
      const ratingMeta = ratingMap.get(storeKey) || { rating: null, totalReviews: 0 };

      return {
        ...favoriteObj,
        store: {
          ...favoriteObj.store,
          rating: ratingMeta.rating,
          totalReviews: ratingMeta.totalReviews,
        },
      };
    });

    return res.status(200).json(payload);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /favorites/{storeId}:
 *   delete:
 *     summary: Remove uma loja dos favoritos do usuário autenticado
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Favorito removido com sucesso
 *       404:
 *         description: Favorito não encontrado
 */
router.delete('/:storeId', auth(['USER', 'LOJA']), async (req, res, next) => {
  try {
    const { storeId } = req.params;
    if (!storeId) {
      return res.status(400).json({ message: 'storeId é obrigatório.' });
    }

    const removed = await Favorite.findOneAndDelete({
      user: req.user.id,
      store: storeId,
    });

    if (!removed) {
      return res.status(404).json({ message: 'Favorito não encontrado para este usuário.' });
    }

    return res.status(200).json({ message: 'Favorito removido com sucesso.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;