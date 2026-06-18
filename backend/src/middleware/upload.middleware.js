const multer = require('multer');

const imageFileFilter = (_req, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  const error = new Error('Le fichier doit etre une image');
  error.status = 400;
  callback(error);
};

const createImageUpload = () => multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadProductImage = createImageUpload();
exports.uploadAvatar = createImageUpload();
