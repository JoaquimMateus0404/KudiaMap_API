const express = require('express');
const mongoose = require('mongoose');
const Store = require('../models/Store');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Post = require('../models/Post');
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
 * /stores/me/dashboard:
 *   get:
 *     summary: Dashboard de métricas para o usuário LOJA autenticado
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas consolidadas da loja para painel do lojista
 */
router.get('/me/dashboard', auth(['LOJA']), async (req, res, next) => {
  try {
    const store = await Store.findOne({ owner: req.user.id }).select(
      'name category description location createdAt updatedAt'
    );

    if (!store) {
      return res.status(200).json({
        hasStore: false,
        store: null,
        metrics: {
          menus: {
            total: 0,
            available: 0,
            unavailable: 0,
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0,
          },
          reviews: {
            total: 0,
            averageRating: null,
          },
          favorites: {
            total: 0,
          },
          posts: {
            total: 0,
            published: 0,
            draft: 0,
            archived: 0,
          },
        },
      });
    }

    const storeId = store._id;

    const [menuAgg, reviewAgg, favoriteCount, postAgg, recentMenus, recentReviews, recentPosts] =
      await Promise.all([
        MenuItem.aggregate([
          { $match: { store: storeId } },
          {
            $group: {
              _id: '$store',
              total: { $sum: 1 },
              available: {
                $sum: {
                  $cond: [{ $eq: ['$available', true] }, 1, 0],
                },
              },
              averagePrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
            },
          },
        ]),
        Review.aggregate([
          { $match: { store: storeId } },
          {
            $group: {
              _id: '$store',
              total: { $sum: 1 },
              averageRating: { $avg: '$rating' },
            },
          },
        ]),
        Favorite.countDocuments({ store: storeId }),
        Post.aggregate([
          {
            $match: {
              store: storeId,
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: '$store',
              total: { $sum: 1 },
              published: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'PUBLISHED'] }, 1, 0],
                },
              },
              draft: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0],
                },
              },
              archived: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'ARCHIVED'] }, 1, 0],
                },
              },
            },
          },
        ]),
        MenuItem.find({ store: storeId })
          .select('name category price available createdAt')
          .sort({ createdAt: -1 })
          .limit(5),
        Review.find({ store: storeId })
          .select('rating comment date')
          .populate('user', 'name')
          .sort({ date: -1 })
          .limit(5),
        Post.find({ store: storeId, isDeleted: false })
          .select('title status publishedAt createdAt')
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    const menuMetrics = menuAgg[0] || {
      total: 0,
      available: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
    };

    const reviewMetrics = reviewAgg[0] || {
      total: 0,
      averageRating: null,
    };

    const postMetrics = postAgg[0] || {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    };

    return res.status(200).json({
      hasStore: true,
      store,
      metrics: {
        menus: {
          total: menuMetrics.total,
          available: menuMetrics.available,
          unavailable: Math.max(0, menuMetrics.total - menuMetrics.available),
          averagePrice: Number((menuMetrics.averagePrice || 0).toFixed(2)),
          minPrice: menuMetrics.minPrice || 0,
          maxPrice: menuMetrics.maxPrice || 0,
        },
        reviews: {
          total: reviewMetrics.total,
          averageRating:
            reviewMetrics.averageRating !== null
              ? Number(reviewMetrics.averageRating.toFixed(1))
              : null,
        },
        favorites: {
          total: favoriteCount,
        },
        posts: {
          total: postMetrics.total,
          published: postMetrics.published,
          draft: postMetrics.draft,
          archived: postMetrics.archived,
        },
      },
      recent: {
        menus: recentMenus,
        reviews: recentReviews,
        posts: recentPosts,
      },
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