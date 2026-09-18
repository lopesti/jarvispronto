const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../models/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'jarvis-comercial';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'jarvis-panel';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_DAYS || 7);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function assertSecret() {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET ausente ou muito curto (min 16 caracteres)');
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  assertSecret();
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_EXPIRES,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

function verifyAccessToken(token) {
  assertSecret();
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

async function createRefreshToken(userId, familyId = null) {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);
  const family = familyId || crypto.randomBytes(16).toString('hex');

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, family_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, family]
  );

  return { raw, familyId: family };
}

/**
 * P1 item 19: detecção de reuso de refresh token.
 * Se o token já foi revogado (reuso), revoga toda a família.
 */
async function rotateRefreshToken(oldRaw) {
  const oldHash = hashToken(oldRaw);

  // Token já revogado = possível roubo → revoga família inteira
  const revoked = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NOT NULL`,
    [oldHash]
  );
  if (revoked.rows.length > 0) {
    const row = revoked.rows[0];
    logger.warn(`[auth] REUSO de refresh detectado user=${row.user_id} family=${row.family_id}`);
    if (row.family_id) {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE family_id = $1 AND revoked_at IS NULL`,
        [row.family_id]
      );
    } else {
      await revokeAllUserTokens(row.user_id);
    }
    const err = new Error('Refresh token reutilizado — sessao revogada por seguranca');
    err.status = 401;
    err.code = 'TOKEN_REUSE';
    throw err;
  }

  const found = await query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [oldHash]
  );
  if (found.rows.length === 0) {
    const err = new Error('Refresh token invalido ou expirado');
    err.status = 401;
    throw err;
  }

  const row = found.rows[0];
  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [row.id]);

  const userRes = await query(
    `SELECT id, name, email, role FROM users WHERE id = $1`,
    [row.user_id]
  );
  if (userRes.rows.length === 0) {
    const err = new Error('Usuario nao encontrado');
    err.status = 401;
    throw err;
  }

  const user = userRes.rows[0];
  const accessToken = signAccessToken(user);
  const { raw: refreshToken } = await createRefreshToken(user.id, row.family_id);
  return { accessToken, refreshToken, user };
}

async function revokeRefreshToken(raw) {
  if (!raw) return;
  const tokenHash = hashToken(raw);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

async function revokeAllUserTokens(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Senha deve ter no minimo 8 caracteres';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Senha deve conter letras e numeros';
  }
  return null;
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email invalido';
  }
  return null;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  validatePassword,
  validateEmail,
  hashPassword,
  comparePassword,
  ACCESS_EXPIRES,
  REFRESH_EXPIRES_DAYS,
};
