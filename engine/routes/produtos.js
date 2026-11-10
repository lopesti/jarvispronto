const checkLimit = require('../middlewares/checkLimit');
const express = require('express');
const router = express.Router();
const ProdutoController = require('../controllers/produtoController');

router.get('/', ProdutoController.list);
router.get('/:id', ProdutoController.getById);
router.post('/', checkLimit('produtos'), ProdutoController.create);
router.put('/:id', ProdutoController.update);
router.delete('/:id', ProdutoController.delete);

module.exports = router;
