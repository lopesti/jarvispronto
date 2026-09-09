const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const meta = require('../services/metaChannelService');
const { query } = require('../models/database');
const { classifyStep, scoreForStep } = require('../utils/funnel');

/** Status dos canais (para o painel) */
router.get('/status', (req, res) => {
  res.json({
    whatsapp: { enabled: true, status: 'active', note: 'Baileys' },
    instagram: {
      enabled: meta.isConfigured(),
      status: meta.isConfigured() ? 'configured' : 'pending_credentials',
      note: 'Meta Graph API — configure META_* no .env',
    },
    facebook: {
      enabled: meta.isConfigured(),
      status: meta.isConfigured() ? 'configured' : 'pending_credentials',
      note: 'Messenger — mesmo app Meta',
    },
    mercadolivre: { enabled: false, status: 'planned' },
    shopee: { enabled: false, status: 'planned' },
    tiktok: { enabled: false, status: 'planned' },
    youtube: { enabled: false, status: 'planned' },
  });
});

/** Webhook verification Meta */
router.get('/meta/webhook', (req, res) => {
  const challenge = meta.verifyWebhook(req.query);
  if (challenge) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

/** Webhook eventos Meta (IG/FB) */
router.post('/meta/webhook', async (req, res) => {
  res.sendStatus(200); // responde rapido
  try {
    const items = meta.normalizeIncoming(req.body);
    for (const item of items) {
      const phone = item.phone;
      const body = item.text;
      const existing = await query(
        'SELECT current_step FROM conversations WHERE phone = $1',
        [phone]
      );
      const prev = existing.rows[0]?.current_step || 'inicio';
      const nextStep = classifyStep(body, prev);
      const score = scoreForStep(nextStep);

      await query(
        `INSERT INTO conversations (phone, channel, external_id, current_step, lead_score, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (phone) DO UPDATE SET
           channel = EXCLUDED.channel,
           external_id = EXCLUDED.external_id,
           current_step = EXCLUDED.current_step,
           lead_score = EXCLUDED.lead_score,
           updated_at = NOW()`,
        [phone, item.channel, item.externalId, nextStep, score]
      );
      await query(
        `INSERT INTO messages (phone, role, content, direction, channel, created_at)
         VALUES ($1, 'user', $2, 'incoming', $3, NOW())`,
        [phone, body, item.channel]
      );

      let responseText = 'Ola! Recebemos sua mensagem.';
      try {
        const geminiService = require('../services/geminiService');
        responseText = await geminiService.generateResponse(body, []);
      } catch (e) {
        logger.warn('[Meta] IA: ' + e.message);
      }

      try {
        await meta.sendText(item.externalId, String(responseText));
        await query(
          `INSERT INTO messages (phone, role, content, direction, channel, created_at)
           VALUES ($1, 'assistant', $2, 'outgoing', $3, NOW())`,
          [phone, String(responseText), item.channel]
        );
      } catch (sendErr) {
        logger.error('[Meta] send: ' + sendErr.message);
      }
    }
  } catch (err) {
    logger.error('[Meta] webhook handler: ' + err.message);
  }
});

module.exports = router;
