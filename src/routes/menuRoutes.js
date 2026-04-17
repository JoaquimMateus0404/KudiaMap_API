const express = require('express');
const MenuItem = require('../models/MenuItem');
const Store = require('../models/Store');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBufferToCloudinary } = require('../config/cloudinary');

const router = express.Router();

/**
 * @swagger
 * /menus:
 *   post:
 *     summary: Cadastra item de menu (somente LOJA dona da loja), com upload opcional de imagem
 *     tags: [Menus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storeId, name, price]
 *             properties:
 *               storeId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               available: { type: boolean }
 *               image:
 *                 type: string
 *                 description: URL externa de imagem (opcional)
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [storeId, name, price]
 *             properties:
 *               storeId: { type: string }
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               available: { type: boolean }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Item criado
 */
router.post('/', auth(['LOJA']), upload.single('image'), async (req, res, next) => {
  try {
    const { storeId, name, description, category, price, image, available = true } = req.body;
    const parsedPrice = Number(price);

    if (!storeId || !name || price === undefined) {
      return res.status(400).json({ message: 'storeId, name e price são obrigatórios.' });
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'price deve ser um número válido maior ou igual a 0.' });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada.' });
    }

    if (String(store.owner) !== req.user.id) {
      return res.status(403).json({ message: 'Você só pode adicionar itens na sua própria loja.' });
    }

    let imageUrl = image;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        public_id: `menu-new-${Date.now()}`,
        overwrite: true,
      });
      imageUrl = uploaded.secure_url;
    }

    const item = await MenuItem.create({
      store: storeId,
      name,
      description,
      category,
      price: parsedPrice,
      image: imageUrl,
      available: typeof available === 'boolean' ? available : available === 'true',
    });

    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /menus/{id}:
 *   patch:
 *     summary: Edita item de menu (somente LOJA dona da loja)
 *     tags: [Menus]
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
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *               available: { type: boolean }
 *     responses:
 *       200:
 *         description: Item atualizado
 */
router.patch('/:id', auth(['LOJA']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await MenuItem.findById(id).populate('store', 'owner');
    if (!item) {
      return res.status(404).json({ message: 'Item do menu não encontrado.' });
    }

    if (String(item.store.owner) !== req.user.id) {
      return res.status(403).json({
        message: 'Você só pode editar itens da sua própria loja.',
      });
    }

    const allowedFields = ['name', 'description', 'category', 'price', 'image', 'available'];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (field === 'price') {
          item[field] = Number(updates[field]);
          return;
        }

        if (field === 'available') {
          item[field] =
            typeof updates[field] === 'boolean' ? updates[field] : updates[field] === 'true';
          return;
        }

        item[field] = updates[field];
      }
    });

    await item.save();
    return res.status(200).json(item);
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /menus/{id}/image:
 *   patch:
 *     summary: Faz upload da imagem do item de menu no Cloudinary
 *     tags: [Menus]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagem atualizada no Cloudinary
 */
router.patch('/:id/image', auth(['LOJA']), upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findById(id).populate({
      path: 'store',
      select: 'owner',
    });

    if (!item) {
      return res.status(404).json({ message: 'Item do menu não encontrado.' });
    }

    if (String(item.store.owner) !== req.user.id) {
      return res.status(403).json({
        message: 'Você só pode editar itens da sua própria loja.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem é obrigatório.' });
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      public_id: `menu-${item._id}-${Date.now()}`,
      overwrite: true,
    });

    item.image = uploaded.secure_url;
    await item.save();

    return res.status(200).json({
      message: 'Imagem atualizada com sucesso.',
      image: item.image,
      cloudinary: {
        publicId: uploaded.public_id,
        format: uploaded.format,
      },
    });
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
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Texto para busca (nome/descrição via índice de texto)
 *         example: burger
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *         description: Categoria do item (filtro parcial, case-insensitive)
 *         example: hamburgueria
 *       - in: query
 *         name: minPrice
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         description: Preço mínimo
 *         example: 10
 *       - in: query
 *         name: maxPrice
 *         required: false
 *         schema:
 *           type: number
 *           format: float
 *         description: Preço máximo
 *         example: 50
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *           enum: [price, name, createdAt]
 *           default: price
 *         description: Campo de ordenação
 *       - in: query
 *         name: order
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Direção da ordenação
 *       - in: query
 *         name: includeUnavailable
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Quando true, inclui itens indisponíveis
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Página (ativa paginação quando enviado com ou sem limit)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Quantidade por página (padrão 20 quando paginação está ativa)
 *     responses:
 *       200:
 *         description: Produtos encontrados (lista simples ou resposta paginada)
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
      includeUnavailable = 'false',
      page,
      limit,
    } = req.query;

    const filter = {};

    if (includeUnavailable !== 'true') {
      filter.available = true;
    }

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

    const query = MenuItem.find(filter)
      .populate('store', 'name category location')
      .sort({ [sortField]: sortOrder });

    const shouldPaginate = page !== undefined || limit !== undefined;

    if (!shouldPaginate) {
      const items = await query;
      return res.status(200).json(items);
    }

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const [items, total] = await Promise.all([
      query.clone().skip(skip).limit(parsedLimit),
      MenuItem.countDocuments(filter),
    ]);

    return res.status(200).json({
      items,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
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