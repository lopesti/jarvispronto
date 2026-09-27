/**
 * Worker separado — único dono do socket WA quando USE_MESSAGE_QUEUE=1
 *
 * BUG-027 corrigido: processa multiplos tenants, nao so empresa 1.
 * BUG-028 corrigido: le companyId do job e passa pra tudo.
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});
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

  // BUG-027 corrigido: NAO conecta empresa 1 automaticamente.
  // O socket e aberto por tenant via POST /api/whatsapp/connect.
  // O worker usa o socket do tenant que estiver no job.
  logger.info(
    '[worker] Socket WA: gerenciado por tenant (POST /api/whatsapp/connect)'
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { from, text, channel, companyId, rid } = job.data;
      const id = rid || job.id;

      if (!companyId || Number.isNaN(Number(companyId))) {
        logger.error(`[worker][${id}] Job sem companyId — descartando`);
        throw new Error('companyId obrigatorio no job');
      }

      const cid = Number(companyId);

      // BUG-027 corrigido: pega o socket DO TENANT, nao global
      const sock = whatsappService.getSock(cid);
      if (!sock) {
        logger.warn(
          `[worker][${id}] Sem socket para company=${cid} — empresa nao conectada`
        );
        return;
      }

      logger.info(
        `[worker][${id}][company=${cid}] Processando de ${from} (${channel || 'whatsapp'})`
      );

      // BUG-027 + BUG-028 corrigidos: passa companyId pro controller
      await messageController.handleMessage(from, text, sock, {
        rid: id,
        companyId: cid,
      });
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