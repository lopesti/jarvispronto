const logger = require('../utils/logger');

const QUEUE_NAME = 'jarvis-incoming-messages';
let queue = null;
let connection = null;

function getConnection() {
  if (connection) return connection;
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const IORedis = require('ioredis');
    connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    return connection;
  } catch (e) {
    logger.error('[queue] Redis connection failed: ' + e.message);
    return null;
  }
}

function getQueue() {
  if (queue) return queue;
  const conn = getConnection();
  if (!conn) return null;
  try {
    const { Queue } = require('bullmq');
    queue = new Queue(QUEUE_NAME, { connection: conn });
    return queue;
  } catch (e) {
    logger.error('[queue] BullMQ init failed: ' + e.message);
    return null;
  }
}

/**
 * Enfileira mensagem recebida.
 * @param {{ from, text, channel, companyId, rid }} payload
 */
async function enqueueIncoming(payload) {
  const companyId = Number(payload.companyId);

  if (!companyId || Number.isNaN(companyId)) {
    logger.error('[queue] companyId ausente — impossivel enfileirar');
    return;
  }

  const q = getQueue();

  if (!q) {
    // Fallback inline: processa imediatamente
    logger.warn('[queue] Fila indisponivel — processando inline');
    const messageController = require('../controllers/messageController');
    const whatsappService = require('./whatsappService');
    const sock = whatsappService.getSock(companyId);
    await messageController.handleMessage(payload.from, payload.text, sock, {
      rid: payload.rid,
      companyId,
    });
    return;
  }

  await q.add(
    'incoming',
    {
      from: payload.from,
      text: payload.text,
      channel: payload.channel || 'whatsapp',
      companyId: companyId, // ← BUG-028 corrigido: propaga tenant no job
      rid: payload.rid || null,
      enqueuedAt: Date.now(),
    },
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );

  logger.info(
    `[queue] Enfileirado company=${companyId} from=${payload.from} rid=${payload.rid || '-'}`
  );
}

module.exports = { enqueueIncoming, getQueue, getConnection, QUEUE_NAME };