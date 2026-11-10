/**
 * Alerta quando WhatsApp desconecta: notificação no painel + Web Push.
 * Debounce por empresa para não spammar em reconexões.
 */
const { query } = require('../models/database');
const logger = require('../utils/logger');
const { publish } = require('./notificationHub');

/** @type {Map<number, number>} companyId -> last notify epoch ms */
const lastNotifyAt = new Map();
const DEBOUNCE_MS = Number(process.env.WA_DISCONNECT_ALERT_DEBOUNCE_MS || 5 * 60 * 1000);

async function notifyWhatsAppDisconnected(companyId, reason = 'connection_close') {
  const id = Number(companyId);
  if (!id) return { skipped: true };

  const now = Date.now();
  const prev = lastNotifyAt.get(id) || 0;
  if (now - prev < DEBOUNCE_MS) {
    logger.info(`[wa-alert] debounce company=${id} reason=${reason}`);
    return { skipped: true, debounced: true };
  }
  lastNotifyAt.set(id, now);

  const title = 'WhatsApp desconectado';
  const body =
    reason === 'logged_out'
      ? 'A sessão foi encerrada (logout). Reconecte o QR em Canais.'
      : reason === 'max_reconnect'
        ? 'Falha ao reconectar automaticamente. Reconecte em Canais.'
        : 'A conexão com o WhatsApp caiu. O sistema tenta reconectar; confira em Canais.';

  try {
    const ins = await query(
      `INSERT INTO notifications (company_id, user_id, type, title, body, payload)
       VALUES ($1, NULL, 'whatsapp.disconnected', $2, $3, $4)
       RETURNING *`,
      [
        id,
        title,
        body,
        JSON.stringify({ reason, at: new Date().toISOString() }),
      ]
    );
    if (ins.rows[0]) {
      try {
        publish(id, ins.rows[0]);
      } catch (_) {}
    }
  } catch (err) {
    logger.warn(`[wa-alert] notification DB: ${err.message}`);
  }

  try {
    const pushService = require('./pushService');
    await pushService.sendPushToCompany(id, {
      title,
      body,
      url: '/channels',
      tag: `wa-disconnected-${id}`,
      type: 'whatsapp.disconnected',
    });
  } catch (err) {
    logger.warn(`[wa-alert] push: ${err.message}`);
  }

  logger.warn(`[wa-alert] company=${id} notificado reason=${reason}`);
  return { ok: true, reason };
}

/** Limpa debounce após reconectar com sucesso (permite alerta rápido se cair de novo). */
function clearDisconnectDebounce(companyId) {
  lastNotifyAt.delete(Number(companyId));
}

module.exports = {
  notifyWhatsAppDisconnected,
  clearDisconnectDebounce,
};
