const express = require('express');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check da API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API ativa
 */
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'KudiaMap API' });
});

module.exports = router;