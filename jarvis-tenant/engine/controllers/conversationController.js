const { pool } = require('../models/database');
const logger = require('../utils/logger');
const { STEPS, scoreForStep } = require('../utils/funnel');

class ConversationController {
  static async list(req, res) {
    try {
      const channel = req.query.channel;
      const filter = req.query.filter; // all | needs_human | mine | unread
      let sql = `
        SELECT
          c.phone,
          c.channel,
          c.external_id,
          c.display_name,
          c.context,
          c.status,
          c.lead_score,
          c.current_step,
          c.needs_human,
          c.assigned_to,
          c.handoff_summary,
          c.bot_mode,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          (
            SELECT content FROM messages
            WHERE phone = c.phone
            ORDER BY created_at DESC LIMIT 1
          ) as "lastMessage",
          (
            SELECT created_at FROM messages
            WHERE phone = c.phone
            ORDER BY created_at DESC LIMIT 1
          ) as "lastMessageAt",
          (
            SELECT COUNT(*) FROM messages
            WHERE phone = c.phone AND role = 'user'
          ) as "messageCount"
        FROM conversations c
        WHERE 1=1
      `;
      // tenant
      const params = [];
      let p = 1;

      if (req.user?.companyId) {
        params.push(req.user.companyId);
        sql += ` AND c.company_id = $${p++}`;
      }

      if (channel && channel !== 'all') {
        params.push(channel);
        sql += ` AND c.channel = $${p++}`;
      }
      if (filter === 'needs_human') {
        sql += ` AND c.needs_human = TRUE`;
      } else if (filter === 'mine' && req.user?.id) {
        params.push(req.user.id);
        sql += ` AND c.assigned_to = $${p++}`;
      }

      sql += ` ORDER BY c.needs_human DESC, c.updated_at DESC`;
      const result = await pool.query(sql, params);
      res.json(result.rows);
    } catch (error) {
      logger.error('Erro ao listar conversas:', error.message);
      res.status(500).json({ message: 'Erro ao listar conversas' });
    }
  }

  static async get(req, res) {
    try {
      const { id } = req.params;
      const convResult = await pool.query(
        'SELECT * FROM conversations WHERE phone = $1 AND ($2::int IS NULL OR company_id = $2)',
        [id, req.user?.companyId || null]
      );
      if (convResult.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      const messagesResult = await pool.query(
        `SELECT * FROM messages WHERE phone = $1 ORDER BY created_at ASC`,
        [id]
      );
      res.json({ ...convResult.rows[0], messages: messagesResult.rows });
    } catch (error) {
      logger.error('Erro ao buscar conversa:', error.message);
      res.status(500).json({ message: 'Erro ao buscar conversa' });
    }
  }

  static async updateStep(req, res) {
    try {
      const { id } = req.params;
      const { step } = req.body;
      if (!step || !STEPS.includes(step)) {
        return res.status(400).json({
          message: 'step invalido',
          allowed: STEPS,
        });
      }
      const score = scoreForStep(step);
      const result = await pool.query(
        `UPDATE conversations
         SET current_step = $1, lead_score = $2, updated_at = NOW()
         WHERE phone = $3
         RETURNING *`,
        [step, score, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao atualizar etapa:', error.message);
      res.status(500).json({ message: 'Erro ao atualizar etapa' });
    }
  }

  /** Handoff: bot → humano */
  static async handoff(req, res) {
    try {
      const { id } = req.params;
      const { summary, assignToMe } = req.body || {};
      const userId = req.user?.id || null;

      let handoffSummary = summary;
      if (!handoffSummary) {
        const msgs = await pool.query(
          `SELECT role, content FROM messages WHERE phone = $1 ORDER BY created_at DESC LIMIT 12`,
          [id]
        );
        const lines = msgs.rows
          .reverse()
          .map((m) => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${(m.content || '').slice(0, 120)}`)
          .join('\n');
        const conv = await pool.query(
          `SELECT current_step, lead_score FROM conversations WHERE phone = $1`,
          [id]
        );
        const step = conv.rows[0]?.current_step || 'inicio';
        const score = conv.rows[0]?.lead_score ?? 0;
        handoffSummary = `Step: ${step} | Score: ${score}\n---\n${lines || 'Sem mensagens'}`;
      }

      const assigned = assignToMe !== false && userId ? userId : null;
      const result = await pool.query(
        `UPDATE conversations
         SET needs_human = TRUE,
             assigned_to = COALESCE($2, assigned_to),
             handoff_summary = $3,
             bot_mode = CASE WHEN bot_mode = 'full' THEN 'hybrid' ELSE bot_mode END,
             updated_at = NOW()
         WHERE phone = $1
         RETURNING *`,
        [id, assigned, handoffSummary]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Erro handoff:', error.message);
      res.status(500).json({ message: 'Erro ao solicitar handoff' });
    }
  }

  /** Assumir conversa (multiusuário leve) */
  static async claim(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Nao autenticado' });
      }
      const result = await pool.query(
        `UPDATE conversations
         SET assigned_to = $2, needs_human = TRUE, updated_at = NOW()
         WHERE phone = $1
         RETURNING *`,
        [id, userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Erro claim:', error.message);
      res.status(500).json({ message: 'Erro ao assumir conversa' });
    }
  }

  /** Devolver ao bot */
  static async releaseToBot(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE conversations
         SET needs_human = FALSE,
             assigned_to = NULL,
             bot_mode = COALESCE($2, 'full'),
             updated_at = NOW()
         WHERE phone = $1
         RETURNING *`,
        [id, req.body?.bot_mode || 'full']
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Erro release:', error.message);
      res.status(500).json({ message: 'Erro ao devolver ao bot' });
    }
  }

  /** Atualizar modo do bot: full | hybrid | human */
  static async setBotMode(req, res) {
    try {
      const { id } = req.params;
      const { bot_mode } = req.body || {};
      const allowed = ['full', 'hybrid', 'human'];
      if (!allowed.includes(bot_mode)) {
        return res.status(400).json({ message: 'bot_mode invalido', allowed });
      }
      const needsHuman = bot_mode === 'human';
      const result = await pool.query(
        `UPDATE conversations
         SET bot_mode = $2,
             needs_human = CASE WHEN $3 THEN TRUE ELSE needs_human END,
             updated_at = NOW()
         WHERE phone = $1
         RETURNING *`,
        [id, bot_mode, needsHuman]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Conversa nao encontrada' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Erro bot_mode:', error.message);
      res.status(500).json({ message: 'Erro ao atualizar modo' });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: 'Mensagem e obrigatoria' });
      }

      await pool.query(
        `INSERT INTO conversations (phone, channel, updated_at)
         VALUES ($1, 'whatsapp', NOW())
         ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()`,
        [id]
      );

      await pool.query(
        `INSERT INTO messages (phone, role, content, direction, channel, created_at)
         VALUES ($1, 'assistant', $2, 'outgoing', 'whatsapp', NOW())`,
        [id, message]
      );

      // Mensagem humana: marca needs_human e atribui se logado
      if (req.user?.id) {
        await pool.query(
          `UPDATE conversations
           SET needs_human = TRUE, assigned_to = COALESCE(assigned_to, $2), updated_at = NOW()
           WHERE phone = $1`,
          [id, req.user.id]
        );
      }

      try {
        const whatsappService = require('../services/whatsappService');
        const sock = whatsappService.getSock && whatsappService.getSock();
        if (sock) await sock.sendMessage(id, { text: message });
      } catch (waErr) {
        logger.warn('WhatsApp send falhou: ' + waErr.message);
      }

      res.json({ ok: true });
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error.message);
      res.status(500).json({ message: 'Erro ao enviar mensagem' });
    }
  }

  static async pipeline(req, res) {
    try {
      const result = await pool.query(`
        SELECT current_step as step, COUNT(*)::int as total
        FROM conversations
        GROUP BY current_step
      `);
      const byStep = {};
      for (const row of result.rows) byStep[row.step || 'inicio'] = row.total;
      res.json({ steps: STEPS, counts: byStep });
    } catch (error) {
      logger.error('Erro pipeline:', error.message);
      res.status(500).json({ message: 'Erro ao carregar pipeline' });
    }
  }
}

module.exports = ConversationController;
