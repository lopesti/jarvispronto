/**
 * Rotas de status/gestão de canais.
 *
 * BUG-050 + BUG-020: o endpoint `/status` retorna o estado de TODOS os canais
 * de uma vez (WhatsApp real, Meta via env global, roadmap fake).
 *
 * FIX (QR → conectado): quando USE_MESSAGE_QUEUE=1 o socket vive no worker.
 * Antes o status de WhatsApp lia a memória local da API (sempre disconnected).
 * Agora busca o estado real no worker via HTTP interno.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const meta = require('../services/metaChannelService');
const authMiddleware = require('../middlewares/auth');

const USE_QUEUE = process.env.USE_MESSAGE_QUEUE === '1';
const WORKER_URL = process.env.WORKER_INTERNAL_URL || 'http://worker:3002';
const INTERNAL_TOKEN = process.env.INTERNAL_SIM_TOKEN || '';

function localWhatsappPayload(companyId) {
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

async function workerWhatsappPayload(companyId) {
  const headers = {
    'Content-Type': 'application/json',
    'x-company-id': String(companyId),
  };
  if (INTERNAL_TOKEN) headers['x-internal-token'] = INTERNAL_TOKEN;

  try {
    const r = await fetch(`${WORKER_URL}/status`, { method: 'GET', headers });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      logger.warn(`[channels] worker status ${r.status}: ${text.slice(0, 120)}`);
      return {
        enabled: true,
        status: 'worker_error',
        connected: false,
        qrPending: false,
        note: `Worker indisponível (${r.status})`,
        label: 'WhatsApp',
      };
    }
    const st = await r.json();
    const connected = !!st.connected || st.state === 'open';
    const hasQr = !!st.hasQr || st.state === 'qr';
    return {
      enabled: true,
      status: st.state || (connected ? 'open' : 'disconnected'),
      connected,
      qrPending: hasQr,
      note: connected
        ? 'Conectado (Baileys / worker)'
        : hasQr
          ? 'Escaneie o QR na aba WhatsApp'
          : 'Desconectado — conecte na aba WhatsApp',
      label: 'WhatsApp',
    };
  } catch (e) {
    logger.error(`[channels] worker status fail: ${e.message}`);
    return {
      enabled: true,
      status: 'worker_unreachable',
      connected: false,
      qrPending: false,
      note: 'Worker inacessível — verifique o container worker e INTERNAL_SIM_TOKEN',
      label: 'WhatsApp',
    };
  }
}

async function whatsappStatusPayload(companyId) {
  if (USE_QUEUE) return workerWhatsappPayload(companyId);
  return localWhatsappPayload(companyId);
}

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const metaOk = meta.isConfigured();
    const whatsapp = await whatsappStatusPayload(companyId);
    res.json({
      whatsapp,
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
  } catch (e) {
    logger.error(`[channels] GET /status: ${e.message}`);
    res.status(500).json({ error: 'Erro ao obter status dos canais' });
  }
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
