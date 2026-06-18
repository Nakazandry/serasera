const router = require('express').Router();
const basicController = require('../controllers/basic.controller');
const { auth } = require('../middleware/auth.middleware');

router.use(auth);
router.get('/', basicController.messages);
router.post('/', basicController.sendMessage);
router.patch('/:id', basicController.updateMessage);
router.delete('/:id', basicController.removeMessage);
router.delete('/conversation/:userId', basicController.removeConversation);

module.exports = router;
