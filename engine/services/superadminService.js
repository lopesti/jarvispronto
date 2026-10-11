/**
 * Promocao de superadmin via variavel de ambiente (S-08).
 *
 * Antes: migration 019 tinha UPDATE ... WHERE email = 'ze@teste.com' hardcoded.
 * Agora: le SUPERADMIN_EMAIL do .env e promove no boot da API.
 *
 * Idempotente: pode rodar quantas vezes quiser.
 */
const { query } = require('../models/database');
const logger = require('../utils/logger');

async function promoteFromEnv() {
  const email = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();

  if (!email) {
    logger.info('[superadmin] SUPERADMIN_EMAIL nao configurado — nenhum superadmin automatico');
    return { promoted: false, reason: 'not_configured' };
  }

  try {
    const { rows } = await query(
      `UPDATE users
          SET is_superadmin = true
        WHERE LOWER(email) = $1
          AND is_superadmin = false
        RETURNING id, name, email`,
      [email]
    );

    if (rows.length === 0) {
      // Pode ser que o usuario nao exista ainda, ou ja seja superadmin
      const { rows: existing } = await query(
        `SELECT id, is_superadmin FROM users WHERE LOWER(email) = $1`,
        [email]
      );
      if (existing.length === 0) {
        logger.warn(`[superadmin] SUPERADMIN_EMAIL="${email}" nao encontrado em users`);
        return { promoted: false, reason: 'user_not_found' };
      }
      logger.info(`[superadmin] "${email}" ja e superadmin`);
      return { promoted: false, reason: 'already_superadmin' };
    }

    const u = rows[0];
    logger.info(`[superadmin] Promovido: ${u.email} (id=${u.id})`);
    return { promoted: true, user: u };
  } catch (err) {
    logger.error(`[superadmin] promoteFromEnv falhou: ${err.message}`);
    return { promoted: false, reason: 'error', error: err.message };
  }
}

module.exports = { promoteFromEnv };