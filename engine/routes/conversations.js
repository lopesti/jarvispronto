const express = require('express');
const router = express.Router();
const ConversationController = require('../controllers/conversationController');

router.get('/', ConversationController.list);
router.get('/pipeline/summary', ConversationController.pipeline);
router.get('/:id', ConversationController.get);
router.patch('/:id/step', ConversationController.updateStep);
router.post('/:id/messages', ConversationController.sendMessage);

module.exports = router;
