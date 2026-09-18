/**
 * Conector Meta (Instagram DM + Facebook Messenger) — ESBOCO
 *
 * Para ativar em producao:
 * 1. Criar app em developers.facebook.com
 * 2. WhatsApp nao entra aqui — so IG/FB Messaging
 * 3. Configurar webhook: POST /api/channels/meta/webhook
 * 4. Env: META_VERIFY_TOKEN, META_PAGE_ACCESS_TOKEN, META_APP_SECRET
 *
 * Fluxo alvo:
 *   Webhook Meta -> normalizeMessage -> messageController generico -> IA -> sendMetaMessage
 */

const logger = require('../utils/logger');

const CHANNEL_INSTAGRAM = 'instagram';
const CHANNEL_FACEBOOK = 'facebook';

function isConfigured() {
  return Boolean(
    process.env.META_PAGE_ACCESS_TOKEN && process.env.META_VERIFY_TOKEN
  );
}

/** Verificacao do webhook (GET) exigida pela Meta */
function verifyWebhook(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

/**
 * Normaliza payload do webhook Meta para formato interno
 * { channel, externalId, displayName, text }
 */
function normalizeIncoming(body) {
  const out = [];
  try {
    const entry = body.entry || [];
    for (const e of entry) {
      const messaging = e.messaging || e.standby || [];
      for (const m of messaging) {
        const text = m.message?.text;
        if (!text) continue;
        const senderId = m.sender?.id;
        if (!senderId) continue;
        // page subscriptions: object pode indicar instagram
        const channel =
          body.object === 'instagram' ? CHANNEL_INSTAGRAM : CHANNEL_FACEBOOK;
        out.push({
          channel,
          externalId: String(senderId),
          phone: `${channel}:${senderId}`,
          displayName: null,
          text,
          raw: m,
        });
      }
    }
  } catch (err) {
    logger.error('[Meta] normalize error: ' + err.message);
  }
  return out;
}

async function sendText(externalId, text) {
  if (!isConfigured()) {
    throw new Error('Meta nao configurado (META_PAGE_ACCESS_TOKEN)');
  }
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${process.env.META_PAGE_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: externalId },
      message: { text },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('Meta send failed: ' + errText);
  }
  return res.json();
}

module.exports = {
  CHANNEL_INSTAGRAM,
  CHANNEL_FACEBOOK,
  isConfigured,
  verifyWebhook,
  normalizeIncoming,
  sendText,
};
