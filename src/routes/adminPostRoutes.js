const express = require('express');
const mongoose = require('mongoose');

const Post = require('../models/Post');
const User = require('../models/User');
const Store = require('../models/Store');
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth(['ADMIN']));

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Admin - métricas gerais do sistema
 *     tags: [Admin Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas consolidadas
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      usersTotal,
      storesTotal,
      productsTotal,
      postsTotal,
      postsPublished,
      postsDraft,
      postsArchived,
      postsDeleted,
    ] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      MenuItem.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ status: 'PUBLISHED', isDeleted: false }),
      Post.countDocuments({ status: 'DRAFT', isDeleted: false }),
      Post.countDocuments({ status: 'ARCHIVED', isDeleted: false }),
      Post.countDocuments({ isDeleted: true }),
    ]);

    return res.status(200).json({
      usersTotal,
      storesTotal,
      productsTotal,
      posts: {
        total: postsTotal,
        published: postsPublished,
        draft: postsDraft,
        archived: postsArchived,
        deleted: postsDeleted,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /admin/posts:
 *   get:
 *     summary: Admin - lista e filtra posts com paginação
 *     tags: [Admin Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PUBLISHED, ARCHIVED] }
 *       - in: query
 *         name: storeId
 *         schema: { type: string }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: boolean, default: false }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de posts
 */
router.get('/posts', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, storeId, includeDeleted = 'false', q } = req.query;

    const filter = {};

    if (includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (status) {
      filter.status = status;
    }

    if (storeId) {
      if (!isValidObjectId(storeId)) {
        return res.status(400).json({ message: 'storeId inválido.' });
      }
      filter.store = storeId;
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate('store', 'name category')
        .populate('createdBy', 'name email type')
        .populate('moderation.reviewedBy', 'name email type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    return res.status(200).json({
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      items,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /admin/posts/{id}:
 *   get:
 *     summary: Admin - detalha um post por id
 *     tags: [Admin Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalhes do post
 */
router.get('/posts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido.' });
    }

    const post = await Post.findById(id)
      .populate('store', 'name category owner')
      .populate('createdBy', 'name email type')
      .populate('moderation.reviewedBy', 'name email type');

    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado.' });
    }

    return res.status(200).json(post);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /admin/posts/{id}:
 *   patch:
 *     summary: Admin - edita título/conteúdo/status de um post
 *     tags: [Admin Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               status: { type: string, enum: [DRAFT, PUBLISHED, ARCHIVED] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Post atualizado
 */
router.patch('/posts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido.' });
    }

    const { title, content, status, reason } = req.body;
    if (!title && !content && !status) {
      return res.status(400).json({ message: 'Informe ao menos um campo para atualização.' });
    }

    if (status && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ message: 'status inválido.' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado.' });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (status) {
      post.status = status;
      if (status === 'PUBLISHED' && !post.publishedAt) {
        post.publishedAt = new Date();
      }
      post.moderation = {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reason: reason || post.moderation?.reason,
      };
    }

    await post.save();

    return res.status(200).json(post);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /admin/posts/{id}/moderate:
 *   patch:
 *     summary: Admin - modera post (publish/archive/restore/delete)
 *     tags: [Admin Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [publish, archive, restore, delete] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Moderação aplicada
 */
router.patch('/posts/:id/moderate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'id inválido.' });
    }

    if (!['publish', 'archive', 'restore', 'delete'].includes(action)) {
      return res.status(400).json({
        message: 'Ação inválida. Use publish, archive, restore ou delete.',
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado.' });
    }

    if (action === 'publish') {
      post.status = 'PUBLISHED';
      post.isDeleted = false;
      post.deletedAt = undefined;
      post.publishedAt = post.publishedAt || new Date();
    }

    if (action === 'archive') {
      post.status = 'ARCHIVED';
      post.isDeleted = false;
      post.deletedAt = undefined;
    }

    if (action === 'restore') {
      post.status = 'DRAFT';
      post.isDeleted = false;
      post.deletedAt = undefined;
    }

    if (action === 'delete') {
      post.isDeleted = true;
      post.deletedAt = new Date();
      post.status = 'ARCHIVED';
    }

    post.moderation = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      reason: reason || '',
    };

    await post.save();

    return res.status(200).json({ message: 'Moderação aplicada com sucesso.', post });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;