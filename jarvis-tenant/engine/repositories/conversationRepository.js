const { query } = require('../models/database');

async function getByPhone(phone, companyId) {
  const r = await query(
    `SELECT * FROM conversations WHERE phone = $1 AND company_id = $2 LIMIT 1`,
    [phone, companyId]
  );
  return r.rows[0] || null;
}

async function upsertStep({ phone, channel, currentStep, leadScore, companyId }) {
  const r = await query(
    `INSERT INTO conversations (phone, channel, current_step, lead_score, company_id, updated_at)
     VALUES ($1, COALESCE($2, 'whatsapp'), $3, $4, $5, NOW())
     ON CONFLICT (company_id, phone) DO UPDATE SET
       current_step = EXCLUDED.current_step,
       lead_score = EXCLUDED.lead_score,
       channel = COALESCE(EXCLUDED.channel, conversations.channel),
       updated_at = NOW()
     RETURNING *`,
    [phone, channel || 'whatsapp', currentStep, leadScore || 0, companyId]
  );
  return r.rows[0];
}

async function markNeedsHuman(phone, summary, companyId) {
  await query(
    `UPDATE conversations
     SET needs_human = TRUE, handoff_summary = $2, updated_at = NOW()
     WHERE phone = $1 AND company_id = $3`,
    [phone, summary, companyId]
  );
}

module.exports = { getByPhone, upsertStep, markNeedsHuman };
