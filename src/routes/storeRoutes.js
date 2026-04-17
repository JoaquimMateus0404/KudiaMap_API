const express = require('express');
const mongoose = require('mongoose');
const Store = require('../models/Store');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

const router = express.Router();

const buildRatingStages = () => [
  {
    $lookup: {
      from: 'reviews',
      let: { storeId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$store', '$$storeId'] } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ],
      as: 'ratingMeta',
    },
  },
  {
    $addFields: {
      totalReviews: {
        $ifNull: [{ $arrayElemAt: ['$ratingMeta.totalReviews', 0] }, 0],
      },
      rating: {
        $cond: [
          {
            $gt: [{ $ifNull: [{ $arrayElemAt: ['$ratingMeta.totalReviews', 0] }, 0] }, 0],
          },
          {
            $round: [{ $arrayElemAt: ['$ratingMeta.avgRating', 0] }, 1],
          },
          null,
        ],
      },
    },
  },
  { $project: { ratingMeta: 0 } },
];

const buildNearbyPipeline = ({ lat, lng, radiusKm, applyRadiusLimit }) => {
  const geoNearStage = {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distanceMeters',
      spherical: true,
    },
  };

  if (applyRadiusLimit) {
    geoNearStage.$geoNear.maxDistance = radiusKm * 1000;
  }

  return [
    geoNearStage,
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    {
      $unwind: {
        path: '$owner',
        preserveNullAndEmptyArrays: true,
      },
    },
    ...buildRatingStages(),
    {
      $project: {
        'owner.password': 0,
        'owner.__v': 0,
      },
    },
    { $sort: { distanceMeters: 1 } },
  ];
};

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
    const stores = await Store.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $unwind: {
          path: '$owner',
          preserveNullAndEmptyArrays: true,
        },
      },
      ...buildRatingStages(),
      {
        $project: {
          'owner.password': 0,
          'owner.__v': 0,
        },
      },
      { $sort: { name: 1 } },
    ]);

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

    let stores = await Store.aggregate(
      buildNearbyPipeline({ lat, lng, radiusKm, applyRadiusLimit: true })
    );

    if (stores.length === 0) {
      stores = await Store.aggregate(
        buildNearbyPipeline({ lat, lng, radiusKm, applyRadiusLimit: false })
      );
    }

    return res.status(200).json(stores);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /stores/me/has-store:
 *   get:
 *     summary: Verifica se o usuário LOJA autenticado já possui loja cadastrada
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retorna apenas hasStore (true/false)
 */
router.get('/me/has-store', auth(['LOJA']), async (req, res, next) => {
  try {
    const store = await Store.findOne({ owner: req.user.id }).select('_id');

    return res.status(200).json({
      hasStore: Boolean(store),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /stores/user/{userId}/has-store:
 *   get:
 *     summary: Verifica se um usuário do tipo LOJA possui loja cadastrada
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Retorna apenas hasStore (true/false)
 *       403:
 *         description: Acesso negado para consultar outro usuário
 */
router.get('/user/:userId/has-store', auth(['LOJA', 'ADMIN']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'userId inválido.' });
    }

    if (req.user.type !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Você não pode consultar outro usuário.' });
    }

    const store = await Store.findOne({ owner: userId }).select('_id');

    return res.status(200).json({
      hasStore: Boolean(store),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /stores/{id}:
 *   get:
 *     summary: Detalhes de uma loja com seus menus
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: onlyAvailable
 *         required: false
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Detalhes da loja e lista de menus
 *       404:
 *         description: Loja não encontrada
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const onlyAvailable = req.query.onlyAvailable === 'true';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'id de loja inválido.' });
    }

    const store = await Store.findById(id).populate('owner', 'name email type');
    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada.' });
    }

    const [ratingSummary] = await Review.aggregate([
      {
        $match: {
          store: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const totalReviews = ratingSummary?.totalReviews || 0;
    const rating = totalReviews > 0 ? Number(ratingSummary.avgRating.toFixed(1)) : null;

    const menuFilter = { store: id };
    if (onlyAvailable) {
      menuFilter.available = true;
    }

    const menus = await MenuItem.find(menuFilter).sort({ price: 1, name: 1 });

    return res.status(200).json({
      store: {
        ...store.toObject(),
        rating,
        totalReviews,
      },
      menus,
      totalMenus: menus.length,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;