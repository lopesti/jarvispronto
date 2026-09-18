/**
 * P1 item 14 — Camada de repositório (Message)
 */
const { query } = require('../models/database');

async function insert({ phone, role, content, direction, channel }) {
  await query(
    `INSERT INTO messages (phone, role, content, direction, channel, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [phone, role, content, direction, channel]
  );
}

async function getHistory(phone, limit = 10) {
  const res = await query(
    `SELECT role, content FROM messages
     WHERE phone = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [phone, limit]
  );
  return res.rows.reverse().map((r) => ({
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content,
  }));
}

module.exports = { insert, getHistory };
