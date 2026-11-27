const logger = require('../utils/logger');
const crypto = require('crypto');

let redis = null;
const memory = new Map();

function getRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const Redis = require('ioredis');

    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 3000
    });

    redis.on('error', (e) => {
      logger.warn('[cache] Redis error: ' + e.message);
    });

    redis.connect().catch(() => {
      logger.warn('[cache] Redis indisponivel — usando memoria');
      redis = null;
    });

    return redis;
  } catch (e) {
    logger.warn('[cache] ioredis nao carregado: ' + e.message);
    return null;
  }
}

function normalizeKey(key) {
  return 'jarvis:ia:' +
    crypto.createHash('sha256')
      .update(String(key))
      .digest('hex')
      .slice(0, 32);
}

async function set(key, value, ttlSeconds = 300) {
  const k = normalizeKey(key);
  const payload = JSON.stringify(value);
  const r = getRedis();

  if (r) {
    try {
      await r.set(k, payload, 'EX', ttlSeconds);
      return;
    } catch (_) {}
  }

  memory.set(k, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

async function get(key) {
  const k = normalizeKey(key);
  const r = getRedis();

  if (r) {
    try {
      const raw = await r.get(k);

      if (raw != null) {
        try {
          const { inc } = require('../utils/metrics');
          inc('ia_cache_hits_total');
        } catch (_) {}

        return JSON.parse(raw);
      }

      return undefined;
    } catch (_) {}
  }

  const entry = memory.get(k);

  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    memory.delete(k);
    return undefined;
  }

  try {
    const { inc } = require('../utils/metrics');
    inc('ia_cache_hits_total');
  } catch (_) {}

  return entry.value;
}

async function del(key) {
  const k = normalizeKey(key);
  const r = getRedis();

  if (r) {
    try {
      await r.del(k);
    } catch (_) {}
  }

  memory.delete(k);
}

// Limpeza periódica somente fora dos testes.
// unref() impede que o temporizador mantenha o processo aberto.
if (process.env.NODE_ENV !== 'test') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of memory.entries()) {
      if (now > entry.expiresAt) {
        memory.delete(key);
      }
    }
  }, 60 * 1000);

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

module.exports = {
  set,
  get,
  del
};
