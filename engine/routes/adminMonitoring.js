const express = require('express');
const { pool } = require('../models/database');

const router = express.Router();

function parseLimit(value, fallback = 50, max = 200) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

function parseCompanyId(value) {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

// Indicadores globais de todas as empresas
router.get('/overview', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM companies) AS companies,
        (SELECT COUNT(*)::int FROM users WHERE COALESCE(is_superadmin, FALSE) = FALSE) AS users,
        (SELECT COUNT(*)::int FROM conversations) AS conversations,
        (SELECT COUNT(*)::int FROM messages) AS messages,
        (SELECT COUNT(*)::int FROM conversations WHERE needs_human = TRUE) AS needs_human,
        (SELECT COUNT(*)::int FROM conversations
          WHERE updated_at >= NOW() - INTERVAL '24 hours') AS active_24h,
        (SELECT COUNT(*)::int FROM messages
          WHERE created_at >= NOW() - INTERVAL '24 hours') AS messages_24h,
        (SELECT COUNT(*)::int FROM companies
          WHERE subscription_status = 'active') AS active_subscriptions
    `);

    const byCompany = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.plan_code,
        c.subscription_status,
        COUNT(DISTINCT conv.id)::int AS conversations,
        COUNT(DISTINCT m.id)::int AS messages,
        COUNT(DISTINCT u.id)::int AS users,
        COUNT(DISTINCT conv.id) FILTER (WHERE conv.needs_human = TRUE)::int AS needs_human,
        MAX(GREATEST(conv.updated_at, m.created_at)) AS last_activity
      FROM companies c
      LEFT JOIN conversations conv ON conv.company_id = c.id
      LEFT JOIN messages m ON m.company_id = c.id
      LEFT JOIN users u ON u.company_id = c.id
      GROUP BY c.id, c.name, c.plan_code, c.subscription_status
      ORDER BY c.name
    `);

    res.json({
      totals: rows[0] || {},
      companies: byCompany.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[adminMonitoring] overview:', error.message);
    res.status(500).json({ error: 'Erro ao carregar indicadores globais' });
  }
});

// Atividade recente: mensagens de todas as empresas
router.get('/activity', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 200);
    const companyId = parseCompanyId(req.query.companyId);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: 'companyId invÃ¡lido' });
    }

    const params = [];
    let where = '';

    if (companyId) {
      params.push(companyId);
      where = 'WHERE m.company_id = $1';
    }

    params.push(limit);

    const { rows } = await pool.query(`
      SELECT
        m.id,
        m.company_id AS "companyId",
        c.name AS "companyName",
        m.phone,
        m.role,
        m.direction,
        m.content,
        m.channel,
        m.created_at AS "createdAt",
        conv.display_name AS "displayName",
        conv.current_step AS "currentStep",
        conv.needs_human AS "needsHuman"
      FROM messages m
      INNER JOIN companies c ON c.id = m.company_id
      LEFT JOIN conversations conv
        ON conv.company_id = m.company_id AND conv.phone = m.phone
      ${where}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $${params.length}
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('[adminMonitoring] activity:', error.message);
    res.status(500).json({ error: 'Erro ao carregar atividade recente' });
  }
});

// Conversas globais, com filtro opcional por empresa
router.get('/conversations', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 200);
    const companyId = parseCompanyId(req.query.companyId);
    const search = String(req.query.q || '').trim().slice(0, 120);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: 'companyId invÃ¡lido' });
    }

    const params = [];
    const conditions = [];

    if (companyId) {
      params.push(companyId);
      conditions.push(`conv.company_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        conv.phone ILIKE $${params.length}
        OR COALESCE(conv.display_name, '') ILIKE $${params.length}
        OR co.name ILIKE $${params.length}
      )`);
    }

    params.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(`
      SELECT
        conv.id,
        conv.company_id AS "companyId",
        co.name AS "companyName",
        conv.phone,
        conv.display_name AS "displayName",
        conv.channel,
        conv.status,
        conv.current_step AS "currentStep",
        conv.lead_score AS "leadScore",
        conv.needs_human AS "needsHuman",
        conv.bot_mode AS "botMode",
        conv.created_at AS "createdAt",
        conv.updated_at AS "updatedAt",
        last_msg.content AS "lastMessage",
        last_msg.created_at AS "lastMessageAt",
        COALESCE(msg_count.total, 0)::int AS "messageCount"
      FROM conversations conv
      INNER JOIN companies co ON co.id = conv.company_id
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE company_id = conv.company_id AND phone = conv.phone
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) last_msg ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM messages
        WHERE company_id = conv.company_id AND phone = conv.phone
      ) msg_count ON TRUE
      ${where}
      ORDER BY conv.updated_at DESC NULLS LAST
      LIMIT $${params.length}
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('[adminMonitoring] conversations:', error.message);
    res.status(500).json({ error: 'Erro ao carregar conversas globais' });
  }
});

// HistÃ³rico de uma conversa especÃ­fica, sempre exigindo empresa + telefone
router.get('/conversations/:companyId/:phone', async (req, res) => {
  try {
    const companyId = parseCompanyId(req.params.companyId);
    const phone = String(req.params.phone || '').trim();

    if (!companyId || Number.isNaN(companyId) || !phone) {
      return res.status(400).json({ error: 'Empresa ou telefone invÃ¡lido' });
    }

    const conversation = await pool.query(`
      SELECT
        conv.*,
        co.name AS company_name
      FROM conversations conv
      INNER JOIN companies co ON co.id = conv.company_id
      WHERE conv.company_id = $1 AND conv.phone = $2
      LIMIT 1
    `, [companyId, phone]);

    if (!conversation.rows.length) {
      return res.status(404).json({ error: 'Conversa nÃ£o encontrada' });
    }

    const messages = await pool.query(`
      SELECT id, phone, role, content, direction, channel, created_at
      FROM messages
      WHERE company_id = $1 AND phone = $2
      ORDER BY created_at ASC, id ASC
    `, [companyId, phone]);

    res.json({
      conversation: conversation.rows[0],
      messages: messages.rows
    });
  } catch (error) {
    console.error('[adminMonitoring] conversation detail:', error.message);
    res.status(500).json({ error: 'Erro ao carregar histÃ³rico da conversa' });
  }
});

module.exports = router;
