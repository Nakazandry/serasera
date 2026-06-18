const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');

router.use(auth);
router.get('/', basicController.orders);
router.patch('/:id/status', basicController.updateOrder);
router.delete('/:id', basicController.removeOrder);

module.exports = router;
