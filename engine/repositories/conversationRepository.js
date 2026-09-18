/**
 * Camada de repositório (Conversation)
 */
const { query } = require('../models/database');

async function getByPhone(phone) {
  const res = await query(
    `SELECT phone, channel, current_step, lead_score, needs_human, assigned_to,
            handoff_summary, bot_mode, updated_at
     FROM conversations WHERE phone = $1`,
    [phone]
  );
  return res.rows[0] || null;
}

async function upsertStep({ phone, channel, currentStep, leadScore, externalId = null }) {
  await query(
    `INSERT INTO conversations (phone, channel, external_id, current_step, lead_score, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (phone) DO UPDATE SET
       channel = EXCLUDED.channel,
       external_id = COALESCE(EXCLUDED.external_id, conversations.external_id),
       current_step = EXCLUDED.current_step,
       lead_score = EXCLUDED.lead_score,
       updated_at = NOW()`,
    [phone, channel, externalId, currentStep, leadScore]
  );
}

async function markNeedsHuman(phone, summary = null) {
  await query(
    `UPDATE conversations
     SET needs_human = TRUE,
         handoff_summary = COALESCE($2, handoff_summary),
         updated_at = NOW()
     WHERE phone = $1`,
    [phone, summary]
  );
}

module.exports = { getByPhone, upsertStep, markNeedsHuman };
