const express = require('express');
const Post = require('../models/Post');
const Store = require('../models/Store');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Cria uma publicação/promoção da loja
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, title, content]
 *             properties:
 *               storeId: { type: string }
 *               title: { type: string }
 *               content: { type: string }
 *     responses:
 *       201:
 *         description: Publicação criada
 */
router.post('/', auth(['LOJA']), async (req, res, next) => {
  try {
    const { storeId, title, content, status = 'PUBLISHED' } = req.body;

    if (!storeId || !title || !content) {
      return res.status(400).json({ message: 'storeId, title e content são obrigatórios.' });
    }

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Loja não encontrada.' });
    if (String(store.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Você só pode publicar na sua própria loja.' });
    }

    const post = await Post.create({
      store: storeId,
      title,
      content,
      status,
      createdBy: req.user.id,
      publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
    });
    return res.status(201).json(post);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Lista publicações/promoções
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Lista de publicações
 */
router.get('/', async (req, res, next) => {
  try {
    const posts = await Post.find({ isDeleted: false, status: 'PUBLISHED' })
      .populate('store', 'name category')
      .sort({ publishedAt: -1 });
    return res.status(200).json(posts);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;