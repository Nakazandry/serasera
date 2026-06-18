const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth, adminOnly } = require('../middleware/auth.middleware');

router.use(auth, adminOnly);
router.get('/stats', basicController.adminStats);
router.get('/users', basicController.adminUsers);
router.get('/products', basicController.adminProducts);
router.get('/orders', basicController.adminOrders);
router.get('/reports', basicController.adminReports);
router.patch('/users/:id/ban', basicController.banUser);
router.patch('/users/:id/unban', basicController.unbanUser);
router.patch('/reports/:id/status', basicController.resolveReport);

module.exports = router;
