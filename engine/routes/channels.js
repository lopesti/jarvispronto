const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const meta = require('../services/metaChannelService');
const authMiddleware = require('../middlewares/auth');
const { query } = require('../models/database');
const { classifyStep, scoreForStep } = require('../utils/funnel');

/**
 * Status e configuração de canais (JWT).
 * Webhooks Meta permanecem públicos.
 */

function whatsappStatusPayload() {
  let wa = {
    enabled: true,
    status: 'unknown',
    connected: false,
    qrPending: false,
    note: 'Baileys',
    label: 'WhatsApp',
  };
  try {
    const whatsappService = require('../services/whatsappService');
    const st = whatsappService.getConnectionStatus && whatsappService.getConnectionStatus();
    if (st) {
      wa.connected = !!st.connected;
      wa.qrPending = !!st.qrPending;
      wa.status = st.connected
        ? 'connected'
        : st.qrPending
          ? 'qr_pending'
          : st.status || 'disconnected';
      wa.note = st.connected
        ? 'Conectado (Baileys)'
        : st.qrPending
          ? 'Escaneie o QR em /qr'
          : 'Desconectado — reconectando ou aguarde QR';
    }
  } catch (e) {
    wa.status = 'error';
    wa.note = e.message;
  }
  return wa;
}

/** Status dos canais (protegido) — UX estilo SaleSmartly */
router.get('/status', authMiddleware, (req, res) => {
  const metaOk = meta.isConfigured();
  res.json({
    whatsapp: whatsappStatusPayload(),
    instagram: {
      enabled: metaOk,
      connected: metaOk,
      status: metaOk ? 'configured' : 'pending_credentials',
      note: metaOk
        ? 'Meta Graph API configurada'
        : 'Configure META_* no .env para ativar',
      label: 'Instagram',
    },
    facebook: {
      enabled: metaOk,
      connected: metaOk,
      status: metaOk ? 'configured' : 'pending_credentials',
      note: metaOk ? 'Messenger — mesmo app Meta' : 'Mesmo app Meta do Instagram',
      label: 'Messenger',
    },
    mercadolivre: {
      enabled: false,
      connected: false,
      status: 'planned',
      note: 'Roadmap TCC',
      label: 'Mercado Livre',
    },
    shopee: {
      enabled: false,
      connected: false,
      status: 'planned',
      note: 'Roadmap',
      label: 'Shopee',
    },
    tiktok: {
      enabled: false,
      connected: false,
      status: 'planned',
      note: 'Roadmap',
      label: 'TikTok',
    },
    youtube: {
      enabled: false,
      connected: false,
      status: 'planned',
      note: 'Roadmap',
      label: 'YouTube',
    },
  });
});

/** Webhook verification Meta (público) */
router.get('/meta/webhook', (req, res) => {
  const challenge = meta.verifyWebhook(req.query);
  if (challenge) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

/** Webhook eventos Meta (IG/FB) */
router.post('/meta/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const items = meta.normalizeIncoming(req.body);
    for (const item of items) {
      const phone = item.phone;
      const body = item.text;
      const existing = await query(
        'SELECT current_step, bot_mode, needs_human FROM conversations WHERE phone = $1',
        [phone]
      );
      const prev = existing.rows[0]?.current_step || 'inicio';
      const botMode = existing.rows[0]?.bot_mode || 'full';
      const alreadyNeedsHuman = existing.rows[0]?.needs_human === true;
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

      // Modo só humano ou já em handoff: não responde com bot
      if (botMode === 'human' || alreadyNeedsHuman) {
        await query(
          `UPDATE conversations SET needs_human = TRUE, updated_at = NOW() WHERE phone = $1`,
          [phone]
        );
        continue;
      }

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
    logger.error('[Meta] webhook: ' + err.message);
  }
});

module.exports = router;
