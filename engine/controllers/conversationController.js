const { pool } = require('../models/database');
const logger = require('../utils/logger');
const { STEPS, scoreForStep } = require('../utils/funnel');

class ConversationController {
  static async list(req, res) {
    try {
      const channel = req.query.channel;
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
      `;
      const params = [];
      if (channel && channel !== 'all') {
        params.push(channel);
        sql += ` WHERE c.channel = $1`;
      }
      sql += ` ORDER BY c.updated_at DESC`;
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
        'SELECT * FROM conversations WHERE phone = $1',
        [id]
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
