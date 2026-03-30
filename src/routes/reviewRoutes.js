const express = require('express');
const Review = require('../models/Review');
const Store = require('../models/Store');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Avalia uma loja
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, rating]
 *             properties:
 *               storeId: { type: string }
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Avaliação criada
 */
router.post('/', auth(['USER', 'LOJA']), async (req, res, next) => {
  try {
    const { storeId, rating, comment } = req.body;

    if (!storeId || rating === undefined) {
      return res.status(400).json({ message: 'storeId e rating são obrigatórios.' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Loja não encontrada.' });

    const review = await Review.create({
      user: req.user.id,
      store: storeId,
      rating,
      comment,
    });

    return res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Você já avaliou esta loja.' });
    }
    return next(error);
  }
});

/**
 * @swagger
 * /reviews/store/{storeId}:
 *   get:
 *     summary: Lista avaliações de uma loja
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista e média de avaliações
 */
router.get('/store/:storeId', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const reviews = await Review.find({ store: storeId })
      .populate('user', 'name')
      .sort({ date: -1 });

    const average =
      reviews.length > 0
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length
        : 0;

    return res.status(200).json({
      total: reviews.length,
      averageRating: Number(average.toFixed(2)),
      reviews,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;