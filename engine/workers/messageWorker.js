/**
 * Worker separado — unico dono do socket WA quando USE_MESSAGE_QUEUE=1
 *
 * BUG-027 corrigido: processa multiplos tenants, nao so empresa 1.
 * BUG-028 corrigido: le companyId do job e passa pra tudo.
 * BUG-033 corrigido: valida Redis no boot com PING + timeout de 5s.
 * BUG-072 corrigido: sobe mini HTTP interno pro API delegar WhatsApp.
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

  // BUG-033: valida que o Redis responde ANTES de subir o worker.
  // `new IORedis()` nao lanca erro sincronamente — sem isso, o worker
  // sobe mesmo com Redis fora, e so descobre quando chega um job.
  try {
    await Promise.race([
      connection.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis PING timeout (5s)')), 5000)
      ),
    ]);
    logger.info('[worker] Redis OK (ping respondeu)');
  } catch (err) {
    logger.error(`[worker] Redis inacessivel no boot: ${err.message}`);
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
      concurrency: Number(process.env.WORKER_CONCURRENCY) || 5,
    }
  );

  // BUG-072: sobe o mini servidor HTTP interno pro API delegar comandos de WhatsApp
  const { startWorkerHttp } = require('./workerHttp');
  startWorkerHttp().catch((err) =>
    logger.error('[worker] Falha ao subir workerHttp: ' + err.message)
  );

  worker.on('completed', (job) => {
    logger.info(`[worker] Job ${job.id} ok`);
  });

  worker.on('failed', (job, err) => {
    logger.error(
      `[worker] Job ${job?.id} falhou: ${err?.message || 'erro desconhecido'}`
    );
  });

  worker.on('error', (err) => {
    logger.error(`[worker] Erro no worker: ${err.message}`);
  });

  logger.info('[worker] Message worker iniciado');
}

start().catch((err) => {
  logger.error('[worker] Falha fatal no boot: ' + err.message);
  process.exit(1);
});