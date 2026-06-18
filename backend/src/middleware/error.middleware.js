const multer = require('multer');

module.exports = (error, _req, res, _next) => {
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({
    message: error.message || 'Erreur serveur',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};
