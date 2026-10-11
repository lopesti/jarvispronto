/**
 * CRM enrichment: notes, deal fields, automations.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { query } = require('../models/database');
const logger = require('../utils/logger');

function companyIdOf(req) {
  return req.user?.companyId || req.user?.company_id;
}

// PATCH lead CRM fields
router.patch('/leads/:phone', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const phone = decodeURIComponent(req.params.phone);
    const { deal_value, lead_source, tags, notes, probability, current_step } = req.body || {};

    const fields = [];
    const vals = [];
    let i = 1;
    if (deal_value !== undefined) { fields.push(`deal_value = $${i++}`); vals.push(Number(deal_value) || 0); }
    if (lead_source !== undefined) { fields.push(`lead_source = $${i++}`); vals.push(lead_source); }
    if (tags !== undefined) { fields.push(`tags = $${i++}`); vals.push(JSON.stringify(tags)); }
    if (notes !== undefined) { fields.push(`notes = $${i++}`); vals.push(notes); }
    if (probability !== undefined) { fields.push(`probability = $${i++}`); vals.push(Number(probability) || 0); }
    if (current_step !== undefined) { fields.push(`current_step = $${i++}`); vals.push(current_step); }
    if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });

    fields.push('updated_at = NOW()');
    vals.push(phone, companyId);

    const { rows } = await query(
      `UPDATE conversations SET ${fields.join(', ')}
       WHERE phone = $${i++} AND company_id = $${i}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    logger.error(`[crm] patch lead: ${err.message}`);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// Notes
router.get('/leads/:phone/notes', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const phone = decodeURIComponent(req.params.phone);
    const { rows } = await query(
      `SELECT n.*, u.name AS user_name
       FROM lead_notes n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.company_id = $1 AND n.phone = $2
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [companyId, phone]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar notas' });
  }
});

router.post('/leads/:phone/notes', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const phone = decodeURIComponent(req.params.phone);
    const body = (req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'body obrigatório' });
    const { rows } = await query(
      `INSERT INTO lead_notes (company_id, phone, user_id, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, phone, req.user?.id || null, body]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar nota' });
  }
});

// Automations CRUD
router.get('/automations', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const { rows } = await query(
      `SELECT * FROM automations WHERE company_id = $1 ORDER BY id DESC`,
      [companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar automações' });
  }
});

router.post('/automations', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const { name, trigger_type, trigger_config, action_type, action_config, enabled } = req.body || {};
    if (!name || !trigger_type || !action_type) {
      return res.status(400).json({ error: 'name, trigger_type e action_type obrigatórios' });
    }
    const { rows } = await query(
      `INSERT INTO automations (company_id, name, enabled, trigger_type, trigger_config, action_type, action_config)
       VALUES ($1, $2, COALESCE($3, true), $4, $5, $6, $7)
       RETURNING *`,
      [
        companyId,
        name,
        enabled,
        trigger_type,
        JSON.stringify(trigger_config || {}),
        action_type,
        JSON.stringify(action_config || {}),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error(`[crm] create automation: ${err.message}`);
    res.status(500).json({ error: 'Erro ao criar automação' });
  }
});

router.patch('/automations/:id', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const id = Number(req.params.id);
    const { name, enabled, trigger_type, trigger_config, action_type, action_config } = req.body || {};
    const { rows } = await query(
      `UPDATE automations SET
         name = COALESCE($3, name),
         enabled = COALESCE($4, enabled),
         trigger_type = COALESCE($5, trigger_type),
         trigger_config = COALESCE($6, trigger_config),
         action_type = COALESCE($7, action_type),
         action_config = COALESCE($8, action_config),
         updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [
        id,
        companyId,
        name ?? null,
        enabled ?? null,
        trigger_type ?? null,
        trigger_config ? JSON.stringify(trigger_config) : null,
        action_type ?? null,
        action_config ? JSON.stringify(action_config) : null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Automação não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar automação' });
  }
});

router.delete('/automations/:id', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const id = Number(req.params.id);
    const r = await query(
      `DELETE FROM automations WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Automação não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir automação' });
  }
});

// Analytics de conversão por etapa
router.get('/analytics/funnel', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const { rows } = await query(
      `SELECT current_step AS step,
              COUNT(*)::int AS total,
              COALESCE(AVG(lead_score),0)::int AS avg_score,
              COALESCE(SUM(deal_value),0)::float AS pipeline_value
       FROM conversations
       WHERE company_id = $1
       GROUP BY current_step
       ORDER BY total DESC`,
      [companyId]
    );
    const total = rows.reduce((a, r) => a + r.total, 0);
    res.json({ total, steps: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro no analytics' });
  }
});

module.exports = router;
