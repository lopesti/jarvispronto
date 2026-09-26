const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const meta = require('../services/metaChannelService');
const authMiddleware = require('../middlewares/auth');

function whatsappStatusPayload(companyId) {
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
    const st = whatsappService.getState(companyId);
    if (st) {
      wa.connected = !!st.connected;
      wa.qrPending = !!st.hasQr;
      wa.status = st.state || 'unknown';
      wa.note = st.connected
        ? 'Conectado (Baileys)'
        : st.hasQr
          ? 'Escaneie o QR na aba WhatsApp'
          : 'Desconectado — conecte na aba WhatsApp';
    }
  } catch (e) {
    wa.status = 'error';
    wa.note = e.message;
  }
  return wa;
}

router.get('/status', authMiddleware, (req, res) => {
  const companyId = req.user.companyId;
  const metaOk = meta.isConfigured();
  res.json({
    whatsapp: whatsappStatusPayload(companyId),
    instagram: {
      enabled: metaOk,
      connected: metaOk,
      status: metaOk ? 'configured' : 'pending_credentials',
      note: metaOk ? 'Meta Graph API configurada' : 'Configure META_* no .env para ativar',
      label: 'Instagram',
    },
    facebook: {
      enabled: metaOk,
      connected: metaOk,
      status: metaOk ? 'configured' : 'pending_credentials',
      note: metaOk ? 'Messenger — mesmo app Meta' : 'Mesmo app Meta do Instagram',
      label: 'Messenger',
    },
    mercadolivre: { enabled: false, connected: false, status: 'planned', note: 'Roadmap TCC', label: 'Mercado Livre' },
    shopee: { enabled: false, connected: false, status: 'planned', note: 'Roadmap', label: 'Shopee' },
    tiktok: { enabled: false, connected: false, status: 'planned', note: 'Roadmap', label: 'TikTok' },
    youtube: { enabled: false, connected: false, status: 'planned', note: 'Roadmap', label: 'YouTube' },
  });
});

router.get('/meta/webhook', (req, res) => {
  const challenge = meta.verifyWebhook(req.query);
  if (challenge) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

/**
 * Webhook Meta (IG/FB) — TODO: implementar multi-tenant com tabela meta_channels.
 * Por ora, retorna 200 (pra Meta não reenviar) mas NÃO grava nada (evita dado órfão).
 */
router.post('/meta/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    logger.warn('[Meta] Webhook recebido mas multi-tenant Meta ainda não implementado. Payload ignorado.');
  } catch (err) {
    logger.error('[Meta] webhook: ' + err.message);
  }
});

module.exports = router;
