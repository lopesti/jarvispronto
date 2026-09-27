const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');
const { invalidateSystemPromptCache } = require('../services/geminiService');

// O authMiddleware eh aplicado no app.js (igual as outras rotas /api/*)

function sameTenant(req, id) {
  const userCompanyId = Number(req.user && req.user.companyId);
  return userCompanyId && userCompanyId === Number(id);
}

/**
 * GET /api/companies/:id/config
 */
router.get('/:id/config', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'id invalido' });
    }
    if (!sameTenant(req, id)) {
      return res.status(403).json({ error: 'Acesso negado a outro tenant' });
    }

    const { rows } = await db.query(
      `SELECT id, name, config FROM companies WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Empresa nao encontrada' });

    return res.json(rows[0]);
  } catch (err) {
    logger.error(`[companies] GET config: ${err.message}`);
    return res.status(500).json({ error: 'Erro ao ler config' });
  }
});

/**
 * PUT /api/companies/:id/config
 * Body: { systemPrompt?, fallbackMessage? }
 */
router.put('/:id/config', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'id invalido' });
    }
    if (!sameTenant(req, id)) {
      return res.status(403).json({ error: 'Acesso negado a outro tenant' });
    }

    const { systemPrompt, fallbackMessage } = req.body || {};
    const patch = {};
    if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
      patch.systemPrompt = systemPrompt.trim();
    }
    if (typeof fallbackMessage === 'string' && fallbackMessage.trim()) {
      patch.fallbackMessage = fallbackMessage.trim();
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    const { rows } = await db.query(
      `UPDATE companies
          SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb
        WHERE id = $2
        RETURNING id, name, config`,
      [JSON.stringify(patch), id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Empresa nao encontrada' });

    invalidateSystemPromptCache(id);
    logger.info(
      `[companies] config atualizada company=${id} user=${req.user.id} chaves=${Object.keys(patch).join(',')}`
    );

    return res.json({ ok: true, company: rows[0] });
  } catch (err) {
    logger.error(`[companies] PUT config: ${err.message}`);
    return res.status(500).json({ error: 'Erro ao atualizar config' });
  }
});

module.exports = router;