const express = require('express');
const MenuItem = require('../models/MenuItem');
const Store = require('../models/Store');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: Cadastra item de menu (somente LOJA dona da loja)
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Item criado
 */
router.post('/', auth(['LOJA']), async (req, res, next) => {
  try {
    const { storeId, name, description, category, price, image, available = true } = req.body;

    if (!storeId || !name || price === undefined) {
      return res.status(400).json({ message: 'storeId, name e price são obrigatórios.' });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada.' });
    }

    if (String(store.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Você só pode adicionar itens na sua própria loja.' });
    }

    const item = await MenuItem.create({
      store: storeId,
      name,
      description,
      category,
      price,
      image,
      available,
    });

    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /menus/search:
 *   get:
 *     summary: Pesquisa produtos por texto/categoria/faixa de preço
 *     tags: [Menus]
 *     responses:
 *       200:
 *         description: Produtos encontrados
 */
router.get('/search', async (req, res, next) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sort = 'price',
      order = 'asc',
    } = req.query;

    const filter = { available: true };

    if (q) {
      filter.$text = { $search: q };
    }

    if (category) {
      filter.category = new RegExp(category, 'i');
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    const sortField = ['price', 'name', 'createdAt'].includes(sort) ? sort : 'price';
    const sortOrder = order === 'desc' ? -1 : 1;

    const items = await MenuItem.find(filter)
      .populate('store', 'name category location')
      .sort({ [sortField]: sortOrder });

    return res.status(200).json(items);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /menus/compare:
 *   get:
 *     summary: Compara preços do mesmo produto entre lojas
 *     tags: [Menus]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comparação de preços
 */
router.get('/compare', async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'O parâmetro name é obrigatório.' });
    }

    const comparison = await MenuItem.find({
      name: new RegExp(name, 'i'),
      available: true,
    })
      .populate('store', 'name category location')
      .sort({ price: 1 });

    return res.status(200).json({
      productQuery: name,
      cheapest: comparison[0] || null,
      items: comparison,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;