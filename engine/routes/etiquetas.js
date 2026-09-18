const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    res.json([
        { id: 1, label: 'Cliente', color: 'blue' },
        { id: 2, label: 'Lead', color: 'green' },
        { id: 3, label: 'Venda', color: 'gold' }
    ]);
});

module.exports = router;
