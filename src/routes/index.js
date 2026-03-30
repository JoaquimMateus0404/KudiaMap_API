const express = require('express');

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const storeRoutes = require('./storeRoutes');
const menuRoutes = require('./menuRoutes');
const postRoutes = require('./postRoutes');
const adminPostRoutes = require('./adminPostRoutes');
const reviewRoutes = require('./reviewRoutes');
const favoriteRoutes = require('./favoriteRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/menus', menuRoutes);
router.use('/posts', postRoutes);
router.use('/admin', adminPostRoutes);
router.use('/reviews', reviewRoutes);
router.use('/favorites', favoriteRoutes);

module.exports = router;