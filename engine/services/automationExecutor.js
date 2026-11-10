/**
 * Executor de automações de funil.
 * Avalia regras da empresa quando o lead muda (score/step/handoff).
 */
const { query } = require('../models/database');
const logger = require('../utils/logger');

/**
 * @param {object} ctx
 * @param {number} ctx.companyId
 * @param {string} ctx.phone
 * @param {number} ctx.score
 * @param {string} ctx.step
 * @param {string} [ctx.prevStep]
 * @param {boolean} [ctx.needsHuman]
 * @param {number} [ctx.daysInStep]
 */
async function runAutomations(ctx) {
  const { companyId, phone, score = 0, step, prevStep, needsHuman } = ctx;
  if (!companyId || !phone) return [];

  let rules;
  try {
    const { rows } = await query(
      `SELECT * FROM automations
       WHERE company_id = $1 AND enabled = true
       ORDER BY id ASC`,
      [companyId]
    );
    rules = rows;
  } catch (err) {
    // tabela ainda não migrada
    if (String(err.message).includes('automations')) return [];
    throw err;
  }

  const results = [];
  for (const rule of rules) {
    try {
      const triggerConfig =
        typeof rule.trigger_config === 'string'
          ? JSON.parse(rule.trigger_config)
          : rule.trigger_config || {};
      const actionConfig =
        typeof rule.action_config === 'string'
          ? JSON.parse(rule.action_config)
          : rule.action_config || {};

      if (!matchesTrigger(rule.trigger_type, triggerConfig, ctx)) continue;

      const outcome = await applyAction(rule.action_type, actionConfig, {
        companyId,
        phone,
        score,
        step,
        ruleId: rule.id,
        ruleName: rule.name,
      });
      results.push({ ruleId: rule.id, name: rule.name, outcome });
      logger.info(
        `[automation] company=${companyId} phone=${phone} rule=${rule.id} action=${rule.action_type} ok`
      );
    } catch (err) {
      logger.error(
        `[automation] company=${companyId} rule=${rule.id} fail: ${err.message}`
      );
      results.push({ ruleId: rule.id, error: err.message });
    }
  }
  return results;
}

function matchesTrigger(type, config, ctx) {
  switch (type) {
    case 'score_gte': {
      const min = Number(config.score ?? config.min ?? 70);
      return Number(ctx.score) >= min;
    }
    case 'step_enter': {
      const target = config.step || config.target;
      if (!target) return false;
      return ctx.step === target && ctx.prevStep !== target;
    }
    case 'needs_human': {
      return ctx.needsHuman === true;
    }
    case 'days_in_step': {
      // precisa daysInStep no ctx (opcional)
      const days = Number(config.days ?? 2);
      return Number(ctx.daysInStep || 0) >= days;
    }
    default:
      return false;
  }
}

async function applyAction(type, config, ctx) {
  switch (type) {
    case 'notify': {
      // registra evento auditável (painel pode ler depois)
      await query(
        `INSERT INTO billing_events (company_id, type, payload)
         VALUES ($1, 'automation.notify', $2)`,
        [
          ctx.companyId,
          JSON.stringify({
            phone: ctx.phone,
            ruleId: ctx.ruleId,
            ruleName: ctx.ruleName,
            channel: config.channel || 'panel',
            message: config.message || `Lead ${ctx.phone} disparou: ${ctx.ruleName}`,
            score: ctx.score,
            step: ctx.step,
          }),
        ]
      );
      return { notified: true };
    }
    case 'move_step': {
      const next = config.step || config.target;
      if (!next) return { skipped: true, reason: 'no_step' };
      await query(
        `UPDATE conversations
         SET current_step = $3, updated_at = NOW()
         WHERE company_id = $1 AND phone = $2`,
        [ctx.companyId, ctx.phone, next]
      );
      return { movedTo: next };
    }
    case 'set_tag': {
      const tag = config.tag || config.name;
      if (!tag) return { skipped: true };
      await query(
        `UPDATE conversations
         SET tags = (
           CASE
             WHEN tags IS NULL OR tags::text = '[]' THEN $3::jsonb
             WHEN tags @> $3::jsonb THEN tags
             ELSE tags || $3::jsonb
           END
         ),
         updated_at = NOW()
         WHERE company_id = $1 AND phone = $2`,
        [ctx.companyId, ctx.phone, JSON.stringify([tag])]
      );
      return { tag };
    }
    case 'handoff': {
      const summary = config.summary || `Automação #${ctx.ruleId}: ${ctx.ruleName}`;
      await query(
        `UPDATE conversations
         SET needs_human = TRUE,
             handoff_summary = $3,
             bot_mode = COALESCE(bot_mode, 'hybrid'),
             updated_at = NOW()
         WHERE company_id = $1 AND phone = $2`,
        [ctx.companyId, ctx.phone, summary]
      );
      return { handoff: true };
    }
    default:
      return { skipped: true, reason: `unknown_action:${type}` };
  }
}

module.exports = { runAutomations };
