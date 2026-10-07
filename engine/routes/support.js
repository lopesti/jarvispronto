// engine/routes/support.js
const express = require('express');
const router = express.Router();
const db = require('../models/database');
const logger = require('../utils/logger');

router.get('/tickets', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*,
             (SELECT COUNT(*) FROM support_messages m
              WHERE m.ticket_id = t.id AND m.is_from_admin = true AND m.read_at IS NULL) AS unread_count,
             (SELECT body FROM support_messages m
              WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message
      FROM support_tickets t
      WHERE t.company_id = $1
      ORDER BY t.updated_at DESC
    `, [req.user.companyId]);
    res.json(rows);
  } catch (e) {
    logger.error('[support] GET /tickets: ' + e.message);
    res.status(500).json({ error: 'Erro ao listar tickets' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const { rows: tickets } = await db.query(`
      SELECT * FROM support_tickets WHERE id = $1 AND company_id = $2
    `, [req.params.id, req.user.companyId]);
    if (!tickets[0]) return res.status(404).json({ error: 'Ticket nao encontrado' });

    const { rows: messages } = await db.query(`
      SELECT m.*, u.name AS author_name
      FROM support_messages m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.id]);

    await db.query(`
      UPDATE support_messages SET read_at = NOW()
      WHERE ticket_id = $1 AND is_from_admin = true AND read_at IS NULL
    `, [req.params.id]);

    res.json({ ticket: tickets[0], messages });
  } catch (e) {
    logger.error('[support] GET /tickets/:id: ' + e.message);
    res.status(500).json({ error: 'Erro ao carregar ticket' });
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const { subject, body, category, priority } = req.body || {};
    if (!subject || !body) {
      return res.status(400).json({ error: 'subject e body sao obrigatorios' });
    }

    const { rows } = await db.query(`
      INSERT INTO support_tickets (company_id, user_id, subject, category, priority)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [req.user.companyId, req.user.id, subject, category || 'other', priority || 'normal']);

    const ticket = rows[0];

    await db.query(`
      INSERT INTO support_messages (ticket_id, user_id, is_from_admin, body)
      VALUES ($1, $2, false, $3)
    `, [ticket.id, req.user.id, body]);

    res.status(201).json(ticket);
  } catch (e) {
    logger.error('[support] POST /tickets: ' + e.message);
    res.status(500).json({ error: 'Erro ao criar ticket' });
  }
});

router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const { body } = req.body || {};
    if (!body) return res.status(400).json({ error: 'body obrigatorio' });

    const { rows: tickets } = await db.query(`
      SELECT * FROM support_tickets WHERE id = $1 AND company_id = $2
    `, [req.params.id, req.user.companyId]);
    if (!tickets[0]) return res.status(404).json({ error: 'Ticket nao encontrado' });

    await db.query(`
      INSERT INTO support_messages (ticket_id, user_id, is_from_admin, body)
      VALUES ($1, $2, false, $3)
    `, [req.params.id, req.user.id, body]);

    await db.query(`
      UPDATE support_tickets SET updated_at = NOW(), status = 'open' WHERE id = $1
    `, [req.params.id]);

    res.json({ ok: true });
  } catch (e) {
    logger.error('[support] POST /tickets/:id/messages: ' + e.message);
    res.status(500).json({ error: 'Erro ao responder' });
  }
});

router.post('/tickets/:id/close', async (req, res) => {
  try {
    await db.query(`
      UPDATE support_tickets SET status = 'closed', closed_at = NOW()
      WHERE id = $1 AND company_id = $2
    `, [req.params.id, req.user.companyId]);
    res.json({ ok: true });
  } catch (e) {
    logger.error('[support] POST /tickets/:id/close: ' + e.message);
    res.status(500).json({ error: 'Erro ao fechar ticket' });
  }
});

module.exports = router;