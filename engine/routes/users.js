const express = require('express');
const router = express.Router();
const { query } = require('../models/database');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
        }
        const result = await query(
            'SELECT id, name, email, role, created_at FROM users WHERE company_id = $1 ORDER BY id',
            [companyId]
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Erro ao listar usuarios:', error.message);
        res.status(500).json({ error: 'Erro ao listar usuarios' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ error: 'Sem empresa vinculada', code: 'NO_COMPANY' });
        }
        const { id } = req.params;
        const result = await query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND company_id = $2',
            [id, companyId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Erro ao buscar usuario:', error.message);
        res.status(500).json({ error: 'Erro ao buscar usuario' });
    }
});

module.exports = router;
