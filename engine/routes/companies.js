const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');
const { invalidateSystemPromptCache } = require('../services/geminiService');
const { invalidateFunnelCache } = require('../utils/funnel');

// O authMiddleware eh aplicado no app.js (igual as outras rotas /api/*)

// S-05: apenas owner ou superadmin pode alterar config do tenant
function canEditConfig(req) {
  return (
    req.user &&
    (req.user.role === 'owner' || req.user.is_superadmin === true)
  );
}

function sameTenant(req, id) {
  const userCompanyId = Number(req.user && req.user.companyId);
  return userCompanyId && userCompanyId === Number(id);
}

// S-05: allowlist de chaves permitidas no config JSONB
const CONFIG_ALLOWLIST = new Set([
  'systemPrompt',
  'fallbackMessage',
  'funnelRules',
  'adminPhone',
]);

// S-05: limites de tamanho (bytes aproximados por campo)
const MAX_SYSTEM_PROMPT = 8000;
const MAX_FALLBACK_MESSAGE = 500;
const MAX_FUNNEL_RULES = 10000;

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
 * S-05 (corrigido): apenas owner/superadmin, allowlist de chaves, limites de tamanho.
 *
 * Chaves aceitas:
 *   - systemPrompt     (string, max 8000 chars)  — prompt do bot (BUG-009)
 *   - fallbackMessage  (string, max 500 chars)   — fallback de IA (BUG-009)
 *   - funnelRules      (object, max 10000 bytes) — regras do funil por tenant (BUG-031)
 *   - adminPhone       (string)                  — telefone do admin
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

    // S-05: somente owner ou superadmin
    if (!canEditConfig(req)) {
      return res
        .status(403)
        .json({ error: 'Apenas owner ou superadmin pode alterar a configuracao' });
    }

    const body = req.body || {};
    const patch = {};

    // systemPrompt
    if (body.systemPrompt !== undefined) {
      if (typeof body.systemPrompt !== 'string') {
        return res.status(400).json({ error: 'systemPrompt deve ser string' });
      }
      const val = body.systemPrompt.trim();
      if (val.length > MAX_SYSTEM_PROMPT) {
        return res.status(400).json({
          error: `systemPrompt excede ${MAX_SYSTEM_PROMPT} caracteres`,
        });
      }
      if (val) patch.systemPrompt = val;
    }

    // fallbackMessage
    if (body.fallbackMessage !== undefined) {
      if (typeof body.fallbackMessage !== 'string') {
        return res.status(400).json({ error: 'fallbackMessage deve ser string' });
      }
      const val = body.fallbackMessage.trim();
      if (val.length > MAX_FALLBACK_MESSAGE) {
        return res.status(400).json({
          error: `fallbackMessage excede ${MAX_FALLBACK_MESSAGE} caracteres`,
        });
      }
      if (val) patch.fallbackMessage = val;
    }

    // funnelRules (objeto)
    if (body.funnelRules !== undefined) {
      if (
        typeof body.funnelRules !== 'object' ||
        body.funnelRules === null ||
        Array.isArray(body.funnelRules)
      ) {
        return res.status(400).json({ error: 'funnelRules deve ser objeto' });
      }
      const size = JSON.stringify(body.funnelRules).length;
      if (size > MAX_FUNNEL_RULES) {
        return res.status(400).json({
          error: `funnelRules excede ${MAX_FUNNEL_RULES} bytes`,
        });
      }
      patch.funnelRules = body.funnelRules;
    }

    // adminPhone
    if (body.adminPhone !== undefined) {
      if (typeof body.adminPhone !== 'string') {
        return res.status(400).json({ error: 'adminPhone deve ser string' });
      }
      const val = body.adminPhone.trim();
      if (val.length > 40) {
        return res.status(400).json({ error: 'adminPhone muito longo' });
      }
      patch.adminPhone = val;
    }

    // S-05: rejeita chaves nao permitidas explicitamente
    const chavesEnviadas = Object.keys(body).filter((k) => k !== 'name');
    const chavesInvalidas = chavesEnviadas.filter(
      (k) => !CONFIG_ALLOWLIST.has(k)
    );
    if (chavesInvalidas.length) {
      return res.status(400).json({
        error: `Chaves nao permitidas: ${chavesInvalidas.join(', ')}`,
        allowed: Array.from(CONFIG_ALLOWLIST),
      });
    }

    // Nome da empresa (coluna, nao config)
    const companyName =
      typeof body.name === 'string' && body.name.trim().length >= 2
        ? body.name.trim()
        : null;

    if (Object.keys(patch).length === 0 && !companyName) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    let rows;
    if (companyName && Object.keys(patch).length) {
      const r = await db.query(
        `UPDATE companies
            SET name = $3,
                config = COALESCE(config, '{}'::jsonb) || $1::jsonb
          WHERE id = $2
          RETURNING id, name, config`,
        [JSON.stringify(patch), id, companyName]
      );
      rows = r.rows;
    } else if (companyName) {
      const r = await db.query(
        `UPDATE companies SET name = $2 WHERE id = $1 RETURNING id, name, config`,
        [id, companyName]
      );
      rows = r.rows;
    } else {
      const r = await db.query(
        `UPDATE companies
            SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb
          WHERE id = $2
          RETURNING id, name, config`,
        [JSON.stringify(patch), id]
      );
      rows = r.rows;
    }
    if (!rows[0]) return res.status(404).json({ error: 'Empresa nao encontrada' });

    invalidateSystemPromptCache(id);
    invalidateFunnelCache(id);
    logger.info(
      `[companies] config atualizada company=${id} user=${req.user.id} role=${req.user.role} chaves=${Object.keys(patch).join(',')}`
    );

    return res.json({ ok: true, company: rows[0] });
  } catch (err) {
    logger.error(`[companies] PUT config: ${err.message}`);
    return res.status(500).json({ error: 'Erro ao atualizar config' });
  }
});

module.exports = router;