const router = require('express').Router();
const productController = require('../controllers/product.controller');
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');
const { uploadProductImage } = require('../middleware/upload.middleware');

router.get('/', productController.list);
router.get('/mine', auth, productController.mine);
router.post('/favorites/add', auth, basicController.favorite);
router.get('/favorites/mine', auth, basicController.favorites);
router.delete('/favorites/:produit_id', auth, basicController.removeFavorite);
router.get('/:id', productController.detail);
router.post('/', auth, uploadProductImage.fields([{ name: 'images', maxCount: 6 }, { name: 'image', maxCount: 1 }]), productController.create);
router.put('/:id', auth, uploadProductImage.fields([{ name: 'images', maxCount: 6 }, { name: 'image', maxCount: 1 }]), productController.update);
router.delete('/:id', auth, productController.remove);

module.exports = router;
