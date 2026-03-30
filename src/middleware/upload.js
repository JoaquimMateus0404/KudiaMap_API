const multer = require('multer');

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
      return;
    }

    cb(null, true);
  },
});

module.exports = upload;