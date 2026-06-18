const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');

router.get('/reasons', basicController.reportReasons);
router.post('/', auth, basicController.reportAccount);

module.exports = router;
