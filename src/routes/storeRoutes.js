const express = require('express');
const Store = require('../models/Store');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /stores:
 *   post:
 *     summary: Cria loja (somente perfil LOJA)
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Loja criada
 */
router.post('/', auth(['LOJA']), async (req, res, next) => {
  try {
    const { name, description, category, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: 'name, latitude e longitude são obrigatórios.',
      });
    }

    const existingStore = await Store.findOne({ owner: req.user.id });
    if (existingStore) {
      return res.status(409).json({ message: 'Este usuário já possui uma loja cadastrada.' });
    }

    const store = await Store.create({
      name,
      description,
      category,
      owner: req.user.id,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
    });

    return res.status(201).json(store);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /stores:
 *   get:
 *     summary: Lista lojas
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: Lista de lojas
 */
router.get('/', async (req, res, next) => {
  try {
    const stores = await Store.find().populate('owner', 'name email');
    return res.status(200).json(stores);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /stores/nearby:
 *   get:
 *     summary: Busca lojas próximas por geolocalização
 *     tags: [Stores]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radiusKm
 *         required: false
 *         schema: { type: number, default: 5 }
 *     responses:
 *       200:
 *         description: Lojas encontradas
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm || 5);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat e lng devem ser números válidos.' });
    }

    const stores = await Store.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    });

    return res.status(200).json(stores);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;