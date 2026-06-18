const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

router.post(
  '/register',
  [
    body('nom').notEmpty(),
    body('prenom').notEmpty(),
    body('email').isEmail(),
    body('mot_de_passe').isLength({ min: 6 }),
  ],
  authController.register
);
router.post('/login', authController.login);
router.get('/me', auth, authController.me);
router.put('/me', auth, uploadAvatar.single('avatar'), authController.updateMe);

module.exports = router;
