const express = require('express');
const router = express.Router();
const ConversationController = require('../controllers/conversationController');

router.get('/', ConversationController.list);
router.get('/pipeline/summary', ConversationController.pipeline);
router.get('/:id', ConversationController.get);
router.patch('/:id/step', ConversationController.updateStep);
router.post('/:id/messages', ConversationController.sendMessage);
router.post('/:id/handoff', ConversationController.handoff);
router.post('/:id/claim', ConversationController.claim);
router.post('/:id/release', ConversationController.releaseToBot);
router.patch('/:id/bot-mode', ConversationController.setBotMode);

module.exports = router;
