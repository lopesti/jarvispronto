const express = require('express');
const router = express.Router();
const AgentController = require('../controllers/agentController');

router.get('/templates', AgentController.templates);
router.get('/global', AgentController.listGlobal);
router.get('/', AgentController.list);
router.get('/produto/:produtoId', AgentController.getByProduto);
router.get('/:id', AgentController.getById);
router.post('/', AgentController.create);
router.put('/:id', AgentController.update);
router.post('/:id/publish', AgentController.publish);
router.post('/:id/archive', AgentController.archive);
router.post('/:id/preview', AgentController.preview);
router.delete('/:id', AgentController.remove);

module.exports = router;
