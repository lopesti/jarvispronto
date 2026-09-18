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

async function enqueueIncoming(payload) {
  const q = getQueue();
  if (!q) {
    logger.warn('[queue] Fila indisponivel — processando inline');
    const messageController = require('../controllers/messageController');
    const whatsappService = require('./whatsappService');
    await messageController.handleMessage(
      payload.from,
      payload.text,
      whatsappService.getSock(),
      { rid: payload.rid }
    );
    return;
  }
  await q.add(
    'incoming',
    {
      from: payload.from,
      text: payload.text,
      channel: payload.channel || 'whatsapp',
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
  logger.info(`[queue] Enfileirado de ${payload.from} rid=${payload.rid || '-'}`);
}

module.exports = { enqueueIncoming, getQueue, getConnection, QUEUE_NAME };
