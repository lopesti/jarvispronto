/**
 * Worker separado — único dono do socket WA quando USE_MESSAGE_QUEUE=1
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const logger = require('../utils/logger');
const { QUEUE_NAME, getConnection } = require('../services/messageQueue');

async function start() {
  const connection = getConnection();
  if (!connection) {
    logger.error('[worker] Redis obrigatorio. Defina REDIS_URL.');
    process.exit(1);
  }

  const { Worker } = require('bullmq');
  const messageController = require('../controllers/messageController');
  const whatsappService = require('../services/whatsappService');

  // Worker é o único processo que abre o socket em modo fila
  await whatsappService.connect(async () => {
    /* novas mensagens entram via fila (API enfileira) */
  });
  logger.info('[worker] Socket WA aberto neste processo (dono unico)');

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { from, text, channel, rid } = job.data;
      const id = rid || job.id;
      logger.info(`[worker][${id}] Processando de ${from} (${channel || 'whatsapp'})`);
      const sock = whatsappService.getSock();
      await messageController.handleMessage(from, text, sock, { rid: id });
    },
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[worker] Job ${job.id} ok`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[worker] Job ${job && job.id} falhou: ${err.message}`);
  });

  logger.info('[worker] Message worker iniciado');
}

start().catch((e) => {
  logger.error('[worker] Fatal: ' + e.message);
  process.exit(1);
});
