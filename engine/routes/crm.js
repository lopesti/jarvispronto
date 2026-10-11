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


// ─── Tasks / follow-up ───────────────────────────────────
router.get('/tasks', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const status = req.query.status || 'open';
    const phone = req.query.phone;
    const params = [companyId];
    let sql = `SELECT t.*, u.name AS assignee_name
               FROM lead_tasks t
               LEFT JOIN users u ON u.id = t.assigned_to
               WHERE t.company_id = $1`;
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }
    if (phone) {
      params.push(phone);
      sql += ` AND t.phone = $${params.length}`;
    }
    sql += ` ORDER BY
      CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
      t.due_at NULLS LAST,
      t.created_at DESC
      LIMIT 200`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    logger.error(`[crm] list tasks: ${err.message}`);
    res.status(500).json({ error: 'Erro ao listar tarefas' });
  }
});

router.post('/tasks', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const { phone, title, description, due_at, priority, assigned_to } = req.body || {};
    if (!phone || !title || !String(title).trim()) {
      return res.status(400).json({ error: 'phone e title obrigatórios' });
    }
    const { rows } = await query(
      `INSERT INTO lead_tasks (
          company_id, phone, title, description, due_at, priority, assigned_to, created_by
       ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'medium'), $7, $8)
       RETURNING *`,
      [
        companyId,
        phone,
        String(title).trim(),
        description || null,
        due_at || null,
        priority || 'medium',
        assigned_to || req.user?.id || null,
        req.user?.id || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error(`[crm] create task: ${err.message}`);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

router.patch('/tasks/:id', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const id = Number(req.params.id);
    const { title, description, due_at, priority, status, assigned_to } = req.body || {};
    const { rows } = await query(
      `UPDATE lead_tasks SET
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         due_at = COALESCE($5, due_at),
         priority = COALESCE($6, priority),
         status = COALESCE($7, status),
         assigned_to = COALESCE($8, assigned_to),
         completed_at = CASE
           WHEN $7 = 'done' THEN NOW()
           WHEN $7 = 'open' THEN NULL
           ELSE completed_at
         END,
         updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [
        id,
        companyId,
        title ?? null,
        description ?? null,
        due_at ?? null,
        priority ?? null,
        status ?? null,
        assigned_to ?? null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    logger.error(`[crm] patch task: ${err.message}`);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const id = Number(req.params.id);
    const r = await query(
      `DELETE FROM lead_tasks WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});



// ─── Notifications ───────────────────────────────────────
router.get('/notifications', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
    const params = [companyId];
    let sql = `SELECT * FROM notifications WHERE company_id = $1`;
    if (unreadOnly) sql += ` AND read_at IS NULL`;
    // se user_id preenchido, mostra gerais da empresa + do usuário
    sql += ` AND (user_id IS NULL OR user_id = $2)`;
    params.push(req.user?.id || 0);
    sql += ` ORDER BY created_at DESC LIMIT 50`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    logger.error(`[crm] notifications: ${err.message}`);
    res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

router.post('/notifications/read', auth, async (req, res) => {
  try {
    const companyId = companyIdOf(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length) {
      await query(
        `UPDATE notifications SET read_at = NOW()
         WHERE company_id = $1 AND id = ANY($2::int[])`,
        [companyId, ids]
      );
    } else {
      await query(
        `UPDATE notifications SET read_at = NOW()
         WHERE company_id = $1 AND read_at IS NULL
           AND (user_id IS NULL OR user_id = $2)`,
        [companyId, req.user?.id || 0]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar lidas' });
  }
});

router.post('/tasks/check-overdue', auth, async (req, res) => {
  try {
    const { processOverdueTasks } = require('../services/taskReminderService');
    const result = await processOverdueTasks();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ─── Web Push ────────────────────────────────────────────
router.get('/push/vapid-public-key', auth, async (_req, res) => {
  try {
    const pushService = require('../services/pushService');
    res.json({ publicKey: pushService.getPublicKey() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/push/subscribe', auth, async (req, res) => {
  try {
    const pushService = require('../services/pushService');
    const companyId = companyIdOf(req);
    const subscription = req.body?.subscription || req.body;
    await pushService.saveSubscription({
      companyId,
      userId: req.user?.id || null,
      subscription,
      userAgent: req.headers['user-agent'],
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error(`[push] subscribe: ${err.message}`);
    res.status(400).json({ error: err.message || 'Falha ao registrar push' });
  }
});

router.post('/push/unsubscribe', auth, async (req, res) => {
  try {
    const pushService = require('../services/pushService');
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ error: 'endpoint obrigatório' });
    await pushService.removeSubscription(endpoint);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/push/test', auth, async (req, res) => {
  try {
    const pushService = require('../services/pushService');
    const companyId = companyIdOf(req);
    const result = await pushService.sendPushToCompany(companyId, {
      title: 'JARVIS',
      body: req.body?.message || 'Notificação de teste do painel',
      url: '/overview',
      tag: 'jarvis-test',
      type: 'test',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ─── SSE: notificações em tempo real ─────────────────────
// EventSource não envia Authorization header → aceita ?token=
router.get('/notifications/stream', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token =
      req.query.token ||
      (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'token obrigatório' });
    }
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'jarvis-dev-secret');
    } catch {
      return res.status(401).json({ error: 'token inválido' });
    }
    const companyId = Number(payload.companyId || payload.company_id);
    if (!companyId) {
      return res.status(403).json({ error: 'sem empresa' });
    }

    const { addStream, removeStream } = require('../services/notificationHub');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write(`event: connected\ndata: ${JSON.stringify({ companyId, at: new Date().toISOString() })}\n\n`);
    addStream(companyId, res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch (_) {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeStream(companyId, res);
    });
  } catch (err) {
    logger.error(`[crm] sse: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: 'SSE falhou' });
  }
});


module.exports = router;
