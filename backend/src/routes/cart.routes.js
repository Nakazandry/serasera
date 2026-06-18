const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');

router.use(auth);
router.get('/', basicController.cart);
router.post('/', basicController.addCart);
router.post('/checkout', basicController.checkout);
router.delete('/:id', basicController.removeCart);

module.exports = router;
