const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth, adminOnly } = require('../middleware/auth.middleware');

router.get('/', basicController.categories);
router.post('/', auth, adminOnly, basicController.createCategory);

module.exports = router;
