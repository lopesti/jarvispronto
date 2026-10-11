/**
 * Web Push (navegador) via web-push + VAPID.
 *
 * Env:
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT          — mailto:ops@seudominio.com
 *
 * Sem chaves: gera em memória no boot (dev) e loga o public key.
 */
const webpush = require('web-push');
const { query } = require('../models/database');
const logger = require('../utils/logger');

let configured = false;

function ensureVapid() {
  if (configured) return true;
  let pub = process.env.VAPID_PUBLIC_KEY;
  let priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@jarvis.local';

  if (!pub || !priv) {
    const keys = webpush.generateVAPIDKeys();
    pub = keys.publicKey;
    priv = keys.privateKey;
    process.env.VAPID_PUBLIC_KEY = pub;
    process.env.VAPID_PRIVATE_KEY = priv;
    logger.warn(
      '[push] VAPID não configurado no .env — gerado em memória (dev). Public: ' +
        pub.slice(0, 16) +
        '...'
    );
  }

  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

function getPublicKey() {
  ensureVapid();
  return process.env.VAPID_PUBLIC_KEY;
}

async function saveSubscription({ companyId, userId, subscription, userAgent }) {
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys || {};
  if (!endpoint || !keys.p256dh || !keys.auth) {
    throw new Error('subscription inválida');
  }
  await query(
    `INSERT INTO push_subscriptions (company_id, user_id, endpoint, p256dh, auth, user_agent, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       company_id = EXCLUDED.company_id,
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = NOW()`,
    [companyId, userId || null, endpoint, keys.p256dh, keys.auth, userAgent || null]
  );
  return { ok: true };
}

async function removeSubscription(endpoint) {
  await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  return { ok: true };
}

async function sendPushToCompany(companyId, payload) {
  ensureVapid();
  const { rows } = await query(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE company_id = $1`,
    [companyId]
  );
  if (!rows.length) return { sent: 0, failed: 0 };

  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const sub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      await webpush.sendNotification(sub, body, {
        TTL: 60 * 60,
        urgency: 'high',
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const status = err?.statusCode;
      logger.warn(`[push] falha company=${companyId} status=${status}: ${err.message}`);
      // 404/410 = subscription expirada
      if (status === 404 || status === 410) {
        await query(`DELETE FROM push_subscriptions WHERE id = $1`, [row.id]);
      }
    }
  }
  return { sent, failed };
}

async function sendPushToUser(userId, payload) {
  ensureVapid();
  const { rows } = await query(
    `SELECT id, endpoint, p256dh, auth, company_id FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  if (!rows.length) return { sent: 0, failed: 0 };
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body,
        { TTL: 3600, urgency: 'high' }
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await query(`DELETE FROM push_subscriptions WHERE id = $1`, [row.id]);
      }
    }
  }
  return { sent, failed };
}

module.exports = {
  ensureVapid,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushToCompany,
  sendPushToUser,
};
