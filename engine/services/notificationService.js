const { query } = require('../models/database');
const { publish } = require('./notificationHub');
const logger = require('../utils/logger');

/**
 * Insere notificação no banco e publica em tempo real (SSE + opcional push).
 */
async function createNotification({
  companyId,
  userId = null,
  type,
  title,
  body = null,
  payload = {},
  push = false,
  pushUrl = '/overview',
}) {
  const { rows } = await query(
    `INSERT INTO notifications (company_id, user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      companyId,
      userId,
      type,
      title,
      body,
      JSON.stringify(payload || {}),
    ]
  );
  const row = rows[0];
  publish(companyId, row);

  if (push) {
    try {
      const pushService = require('./pushService');
      await pushService.sendPushToCompany(companyId, {
        title,
        body: body || title,
        url: pushUrl,
        tag: `${type}-${row.id}`,
        type,
      });
    } catch (err) {
      logger.warn(`[notification] push: ${err.message}`);
    }
  }

  return row;
}

module.exports = { createNotification };
