// engine/routes/adminUsers.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');

// GET /api/admin/users — lista todos os usuários
router.get('/', async (req, res) => {
  try {
    const { q, role, companyId } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (q) {
      conditions.push(`(u.name ILIKE $${i} OR u.email ILIKE $${i} OR u.id::text = $${i + 1})`);
      params.push(`%${q}%`, q);
      i += 2;
    }
    if (role) {
      conditions.push(`u.role = $${i++}`);
      params.push(role);
    }
    if (companyId) {
      conditions.push(`u.company_id = $${i++}`);
      params.push(Number(companyId));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.is_superadmin,
        u.company_id,
        u.created_at,
        c.name AS company_name
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      ${where}
      ORDER BY u.id DESC
      LIMIT 200
    `, params);

    res.json(rows);
  } catch (e) {
    logger.error(`[admin/users] GET /: ${e.message}`);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// GET /api/admin/users/:id — detalhe
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id, u.name, u.email, u.role, u.is_superadmin,
        u.company_id, u.created_at,
        c.name AS company_name, c.slug AS company_slug
      FROM users u
      LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.id = $1
    `, [req.params.id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(rows[0]);
  } catch (e) {
    logger.error(`[admin/users] GET /:id: ${e.message}`);
    res.status(500).json({ error: 'Erro ao carregar usuário' });
  }
});

// PUT /api/admin/users/:id — promover/rebaixar superadmin
router.put('/:id', async (req, res) => {
  try {
    const { is_superadmin, role } = req.body || {};

    const sets = [];
    const params = [];
    let i = 1;

    if (typeof is_superadmin === 'boolean') {
      sets.push(`is_superadmin = $${i++}`);
      params.push(is_superadmin);
    }
    if (role) {
      sets.push(`role = $${i++}`);
      params.push(role);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    params.push(req.params.id);

    const { rows } = await db.query(`
      UPDATE users
      SET ${sets.join(', ')}
      WHERE id = $${i}
      RETURNING id, name, email, role, is_superadmin
    `, params);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    logger.info(`[admin/users] user=${req.params.id} atualizado por superadmin=${req.user.id}`);
    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    logger.error(`[admin/users] PUT /:id: ${e.message}`);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;