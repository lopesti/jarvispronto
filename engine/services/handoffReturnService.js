/**
 * F-09: devolve conversas ao bot após N minutos sem resposta humana.
 * Env: HANDOFF_RETURN_MINUTES=30, HANDOFF_RETURN_CRON=*/15 * * * *
 */
const cron = require('node-cron');
const { query } = require('../models/database');
const logger = require('../utils/logger');

let started = false;

async function processHandoffReturns() {
  const minutes = Number(process.env.HANDOFF_RETURN_MINUTES || 30);
  const { rows } = await query(
    `UPDATE conversations
     SET needs_human = FALSE,
         bot_mode = CASE WHEN bot_mode = 'human' THEN 'hybrid' ELSE bot_mode END,
         updated_at = NOW()
     WHERE needs_human = TRUE
       AND updated_at < NOW() - ($1 || ' minutes')::interval
       AND (bot_mode IS NULL OR bot_mode IN ('human', 'hybrid', 'full'))
     RETURNING phone, company_id`,
    [String(minutes)]
  );
  if (rows.length) {
    logger.info(`[handoff-return] ${rows.length} conversa(s) devolvidas ao bot após ${minutes}min`);
  }
  return { returned: rows.length };
}

function startHandoffReturnCron() {
  if (started) return;
  if (process.env.HANDOFF_RETURN_ENABLED === '0') return;
  const expr = process.env.HANDOFF_RETURN_CRON || '*/15 * * * *';
  if (!cron.validate(expr)) return;
  cron.schedule(expr, () => {
    processHandoffReturns().catch((e) => logger.error(`[handoff-return] ${e.message}`));
  });
  started = true;
  logger.info(`[handoff-return] cron ${expr}`);
}

module.exports = { startHandoffReturnCron, processHandoffReturns };
