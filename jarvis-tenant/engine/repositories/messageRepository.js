const { query } = require('../models/database');

async function insert({ phone, role, content, direction, channel, companyId }) {
  const r = await query(
    `INSERT INTO messages (phone, role, content, direction, channel, company_id, created_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'whatsapp'), $6, NOW())
     RETURNING *`,
    [phone, role, content, direction || 'incoming', channel, companyId]
  );
  return r.rows[0];
}

async function getHistory(phone, limit = 10, companyId) {
  const r = await query(
    `SELECT role, content, direction, created_at
     FROM messages
     WHERE phone = $1 AND ($3::int IS NULL OR company_id = $3)
     ORDER BY created_at DESC
     LIMIT $2`,
    [phone, limit, companyId || null]
  );
  return r.rows.reverse();
}

module.exports = { insert, getHistory };
