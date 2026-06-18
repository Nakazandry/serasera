const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');

router.post('/', auth, basicController.rateSeller);

module.exports = router;
