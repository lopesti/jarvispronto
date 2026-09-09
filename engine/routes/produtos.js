const express = require('express');
const router = express.Router();
const { query } = require('../models/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM produtos ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        logger.error('Erro ao listar produtos:', error.message);
        res.status(500).json({ error: 'Erro ao listar produtos' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM produtos WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto nao encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Erro ao buscar produto:', error.message);
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

module.exports = router;
