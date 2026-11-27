// engine/routes/adminCompanies.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');

// GET /api/admin/companies â€” lista todas as empresas
router.get('/', async (req, res) => {
  try {
    const { q, plan } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (q) {
      conditions.push(`(c.name ILIKE $${i} OR c.slug ILIKE $${i} OR c.id::text = $${i + 1})`);
      params.push(`%${q}%`, q);
      i += 2;
    }
    if (plan) {
      conditions.push(`c.plan_code = $${i++}`);
      params.push(plan);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.plan_code,
        c.subscription_status,
        c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS users_count,
        (SELECT COUNT(*) FROM conversations conv WHERE conv.company_id = c.id) AS conversations_count,
        (SELECT COUNT(*) FROM messages m WHERE m.company_id = c.id) AS messages_count
      FROM companies c
      ${where}
      ORDER BY c.id DESC
      LIMIT 200
    `, params);

    res.json(rows);
  } catch (e) {
    logger.error(`[admin/companies] GET /: ${e.message}`);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// POST /api/admin/companies/:id/access-context
router.post('/:id/access-context', async (req, res) => {
  try {
    const companyId = Number(req.params.id);

    if (!Number.isInteger(companyId) || companyId <= 0) {
      return res.status(400).json({ error: 'ID de empresa invalido' });
    }

    const { createContextToken } = require('../services/adminCompanyContext');
    const result = await createContextToken(req.user.id, companyId);

    logger.info(
      `[admin/companies] contexto iniciado admin=${req.user.id} company=${companyId}`
    );

    res.json({
      ok: true,
      contextToken: result.token,
      company: result.company,
      expiresIn: 28800,
    });
  } catch (e) {
    logger.error(`[admin/companies] access-context: ${e.message}`);
    res.status(e.status || 500).json({
      error: e.message || 'Erro ao iniciar acesso administrativo',
    });
  }
});
// GET /api/admin/companies/:id â€” detalhe de uma empresa
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS users_count,
        (SELECT COUNT(*) FROM conversations conv WHERE conv.company_id = c.id) AS conversations_count,
        (SELECT COUNT(*) FROM messages m WHERE m.company_id = c.id) AS messages_count,
        (SELECT COUNT(*) FROM produtos p WHERE p.company_id = c.id) AS products_count
      FROM companies c
      WHERE c.id = $1
    `, [req.params.id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Empresa nÃ£o encontrada' });
    }

    res.json(rows[0]);
  } catch (e) {
    logger.error(`[admin/companies] GET /:id: ${e.message}`);
    res.status(500).json({ error: 'Erro ao carregar empresa' });
  }
});

// PUT /api/admin/companies/:id â€” atualizar status/plano
router.put('/:id', async (req, res) => {
  try {
    const { subscription_status, plan_code } = req.body || {};

    const sets = [];
    const params = [];
    let i = 1;

    if (subscription_status) {
      sets.push(`subscription_status = $${i++}`);
      params.push(subscription_status);
    }
    if (plan_code) {
      sets.push(`plan_code = $${i++}`);
      params.push(plan_code);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    params.push(req.params.id);

    const { rows } = await db.query(`
      UPDATE companies
      SET ${sets.join(', ')}
      WHERE id = $${i}
      RETURNING id, name, slug, plan_code, subscription_status
    `, params);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Empresa nÃ£o encontrada' });
    }

    logger.info(`[admin/companies] company=${req.params.id} atualizado por user=${req.user.id}`);
    res.json({ ok: true, company: rows[0] });
  } catch (e) {
    logger.error(`[admin/companies] PUT /:id: ${e.message}`);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

module.exports = router;
