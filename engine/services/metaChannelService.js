/**
 * Conector Meta (Instagram DM + Facebook Messenger) — ESBOCO
 *
 * ⚠️ DÉBITO TÉCNICO — BUG-019 + BUG-034 + BUG-050 + BUG-053
 * ─────────────────────────────────────────────────────────
 * Este serviço ainda NÃO é multi-tenant:
 *   - `isConfigured()` lê process.env.META_* (token global)
 *   - `verifyWebhook()` valida contra um único META_VERIFY_TOKEN
 *   - `sendText()` usa o mesmo PAGE_ACCESS_TOKEN pra todos tenants
 *   - `routes/channels.js` não mapeia page_id → company_id
 *
 * Para habilitar Meta em SaaS, precisa:
 *   1. Migração: tabela `meta_channels (company_id, page_id, access_token, verify_token, app_secret)`
 *   2. `isConfigured(companyId)` lê do DB
 *   3. Webhook POST resolve `page_id → company_id` via DB
 *   4. `sendText(companyId, externalId, text)` usa token do tenant
 *   5. Frontend: campos de config por tenant em /settings
 *
 * Por enquanto, sem META_* no .env, o /status retorna pending_credentials
 * e a UI esconde os cards. Nada quebra.
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