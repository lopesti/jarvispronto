const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');
const { invalidateSystemPromptCache } = require('../services/geminiService');
const { invalidateFunnelCache } = require('../utils/funnel');

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
 *
 * Aceita qualquer chave JSON:
 *   - systemPrompt     (string) — prompt do bot (BUG-009)
 *   - fallbackMessage  (string) — fallback de IA (BUG-009)
 *   - funnelRules      (object) — regras do funil por tenant (BUG-031)
 *   - adminPhone       (string) — telefone admin (futuro BUG-035)
 *   - e o que mais vier no config JSONB
 *
 * BUG-071: antes era allowlist hardcoded e rejeitava campos novos.
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

    const body = req.body || {};
    const patch = {};

    // Campos texto: normaliza (trim) e ignora vazios
    if (typeof body.systemPrompt === 'string' && body.systemPrompt.trim()) {
      patch.systemPrompt = body.systemPrompt.trim();
    }
    if (typeof body.fallbackMessage === 'string' && body.fallbackMessage.trim()) {
      patch.fallbackMessage = body.fallbackMessage.trim();
    }

    // BUG-071: aceita qualquer chave JSON extra (funnelRules, adminPhone, etc.)
    const RESERVED = new Set(['systemPrompt', 'fallbackMessage']);
    for (const [k, v] of Object.entries(body)) {
      if (RESERVED.has(k)) continue;
      if (v === undefined) continue;
      patch[k] = v;
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
    invalidateFunnelCache(id);
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