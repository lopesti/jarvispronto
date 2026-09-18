const cron = require('node-cron');
const logger = require('../utils/logger');

// Número do administrador (coloque o seu número com DDD, sem + e sem espaço)
const ADMIN_PHONE = process.env.ADMIN_PHONE || '5511999999999';

let isSending = false;

async function sendHealthMessage(sock) {
  if (isSending) {
    logger.info('[HEALTH] Já enviando uma mensagem, ignorando ciclo atual.');
    return;
  }

  if (!sock || !sock.user) {
    logger.warn('[HEALTH] WhatsApp não conectado, não é possível enviar healthcheck.');
    return;
  }

  isSending = true;
  try {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const message = `✅ BOT ONLINE ✅\n\n📅 ${timestamp}\n🤖 JarvisPronto está funcionando normalmente.\n📊 Uptime: ${process.uptime().toFixed(0)} segundos.\n\nMonitoramento ativo a cada 10 minutos.`;

    await sock.sendMessage(ADMIN_PHONE + '@s.whatsapp.net', { text: message });
    logger.info(`[HEALTH] Mensagem enviada para ${ADMIN_PHONE} com sucesso.`);
  } catch (err) {
    logger.error('[HEALTH] Erro ao enviar mensagem de saúde:', err.message);
  } finally {
    isSending = false;
  }
}

function startHealthCheck(sock) {
  // Agendamento a cada 10 minutos
  cron.schedule('*/10 * * * *', () => {
    logger.info('[HEALTH] Executando healthcheck agendado...');
    sendHealthMessage(sock);
  });

  // Envia uma mensagem inicial 10 segundos após o bot conectar
  setTimeout(() => {
    sendHealthMessage(sock);
  }, 10000);

  logger.info('[HEALTH] Healthcheck agendado para cada 10 minutos.');
}

module.exports = { startHealthCheck, sendHealthMessage };