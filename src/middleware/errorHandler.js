const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Imagem excede o limite de 5MB.'
        : 'Erro no upload da imagem.';

    return res.status(400).json({ message });
  }

  if (err.message === 'Apenas arquivos de imagem são permitidos.') {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  return res.status(status).json({
    message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;