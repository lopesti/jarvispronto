// engine/routes/adminSupport.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');

router.get('/tickets', async (req, res) => {
  try {
    const { status, companyId, assigned } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (status) { conditions.push(`t.status = $${i++}`); params.push(status); }
    if (companyId) { conditions.push(`t.company_id = $${i++}`); params.push(Number(companyId)); }
    if (assigned === 'me') { conditions.push(`t.assigned_to = $${i++}`); params.push(req.user.id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT t.*, c.name AS company_name,
             (SELECT COUNT(*) FROM support_messages m
              WHERE m.ticket_id = t.id AND m.is_from_admin = false AND m.read_at IS NULL) AS unread_count,
             (SELECT body FROM support_messages m
              WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message
      FROM support_tickets t
      JOIN companies c ON c.id = t.company_id
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        t.updated_at DESC
      LIMIT 200
    `, params);

    res.json(rows);
  } catch (e) {
    logger.error('[admin/support] GET /tickets: ' + e.message);
    res.status(500).json({ error: 'Erro ao listar tickets' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const { rows: tickets } = await db.query(`
      SELECT t.*, c.name AS company_name
      FROM support_tickets t
      JOIN companies c ON c.id = t.company_id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!tickets[0]) return res.status(404).json({ error: 'Ticket nao encontrado' });

    const { rows: messages } = await db.query(`
      SELECT m.*, u.name AS author_name, u.email AS author_email
      FROM support_messages m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.id]);

    await db.query(`
      UPDATE support_messages SET read_at = NOW()
      WHERE ticket_id = $1 AND is_from_admin = false AND read_at IS NULL
    `, [req.params.id]);

    res.json({ ticket: tickets[0], messages });
  } catch (e) {
    logger.error('[admin/support] GET /tickets/:id: ' + e.message);
    res.status(500).json({ error: 'Erro ao carregar ticket' });
  }
});

router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body) return res.status(400).json({ error: 'body obrigatorio' });

    await db.query(`
      INSERT INTO support_messages (ticket_id, user_id, is_from_admin, body)
      VALUES ($1, $2, true, $3)
    `, [req.params.id, req.user.id, body]);

    await db.query(`
      UPDATE support_tickets SET updated_at = NOW(), status = 'waiting' WHERE id = $1
    `, [req.params.id]);

    res.json({ ok: true });
  } catch (e) {
    logger.error('[admin/support] POST /tickets/:id/messages: ' + e.message);
    res.status(500).json({ error: 'Erro ao responder' });
  }
});

router.put('/tickets/:id/assign', async (req, res) => {
  try {
    const adminId = req.body?.adminId || req.user.id;
    await db.query(`UPDATE support_tickets SET assigned_to = $1 WHERE id = $2`, [adminId, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    logger.error('[admin/support] PUT /tickets/:id/assign: ' + e.message);
    res.status(500).json({ error: 'Erro ao atribuir' });
  }
});

router.put('/tickets/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const valid = ['open', 'waiting', 'resolved', 'closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Status invalido' });

    await db.query(`
      UPDATE support_tickets
      SET status = $1,
          closed_at = CASE WHEN $1 IN ('resolved','closed') THEN NOW() ELSE NULL END
      WHERE id = $2
    `, [status, req.params.id]);

    res.json({ ok: true });
  } catch (e) {
    logger.error('[admin/support] PUT /tickets/:id/status: ' + e.message);
    res.status(500).json({ error: 'Erro ao mudar status' });
  }
});

module.exports = router;