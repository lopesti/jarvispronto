const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const logger = require('../utils/logger');
const pino = require('pino');
const { isBlocked } = require('./blacklistService');
const { processGroupMessage } = require('./groupMonitor');

let sock = null;
let currentSock = null;
let reconnectAttempts = 0;
let circuitOpenUntil = 0;
/** @type {'disconnected'|'qr'|'connecting'|'open'|'close'} */
let connectionState = 'disconnected';

// P1 item 13: backoff exponencial + jitter + circuit breaker
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 5 * 60 * 1000; // 5 min
const CIRCUIT_THRESHOLD = 8;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 min

function nextDelayMs(attempt) {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(1000, exp * 0.2));
  return exp + jitter;
}

async function connect(onMessage) {
  if (Date.now() < circuitOpenUntil) {
    const wait = circuitOpenUntil - Date.now();
    logger.warn(`[WA] Circuit breaker aberto. Proxima tentativa em ${Math.round(wait / 1000)}s`);
    setTimeout(() => connect(onMessage), wait);
    return null;
  }

  const authDir = path.resolve(__dirname, '../../auth_info_jarvis');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const silentLogger = pino({ level: 'silent' });

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: silentLogger,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  currentSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      global.currentQR = qr;
      connectionState = 'qr';
      logger.info('[WA] QR Code atualizado. Acesse /qr para escanear.');
      qrcode.generate(qr, { small: true });
      reconnectAttempts = 0;
    }

    if (connection === 'connecting') {
      connectionState = 'connecting';
    }

    if (connection === 'close') {
      connectionState = 'close';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const replaced = statusCode === 440;

      logger.warn(`[WA] Conexao encerrada. Codigo: ${statusCode}`);

      if (loggedOut) {
        connectionState = 'disconnected';
        logger.error('[WA] Sessao encerrada (loggedOut). Remova auth_info_jarvis para novo QR.');
        return;
      }

      reconnectAttempts += 1;
      if (reconnectAttempts >= CIRCUIT_THRESHOLD) {
        circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
        logger.error(`[WA] Circuit breaker: ${reconnectAttempts} falhas. Pausando ${CIRCUIT_COOLDOWN_MS / 60000} min`);
        reconnectAttempts = 0;
        setTimeout(() => connect(onMessage), CIRCUIT_COOLDOWN_MS);
        return;
      }

      const delay = replaced ? Math.max(10000, nextDelayMs(reconnectAttempts)) : nextDelayMs(reconnectAttempts);
      logger.info(`[WA] Reconectando em ${Math.round(delay / 1000)}s (tentativa ${reconnectAttempts})`);
      setTimeout(() => connect(onMessage), delay);
    }

    if (connection === 'open') {
      logger.info('[WA] WhatsApp conectado com sucesso!');
      global.currentQR = null;
      connectionState = 'open';
      reconnectAttempts = 0;
      circuitOpenUntil = 0;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'append') {
      for (const msg of messages) {
        await processOne(msg, onMessage, true);
      }
      return;
    }
    if (type !== 'notify') return;
    for (const msg of messages) {
      await processOne(msg, onMessage, false);
    }
  });

  return sock;
}

async function processOne(msg, onMessage, isAppend) {
  if (msg.key?.fromMe) return;
  if (msg.key.remoteJid === 'status@broadcast') return;

  if (isAppend) {
    const ts = Number(msg.messageTimestamp || 0);
    const age = Date.now() / 1000 - ts;
    if (age > 300) return;
  }

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    '';
  if (!text.trim()) return;

  if (isGroup) {
    let groupName = from;
    try {
      const meta = await sock.groupMetadata(from);
      groupName = meta.subject;
    } catch (_) {}
    processGroupMessage(groupName, msg.key.participant || from, text);
    return;
  }

  if (isBlocked(from)) {
    logger.info(`[WA] Numero bloqueado: ${from}`);
    return;
  }

  try {
    const { inc } = require('../utils/metrics');
    inc('messages_received_total');
  } catch (_) {}

  try {
    await onMessage(from, text, sock);
  } catch (err) {
    logger.error(`Erro ao processar mensagem de ${from}: ${err.message}`);
  }
}

async function disconnect() {
  if (sock) {
    await sock.logout().catch(() => {});
    sock = null;
    currentSock = null;
  }
}

function getSock() {
  return currentSock;
}

/** Status para o painel (SaleSmartly-style channel indicator) */
function getConnectionStatus() {
  const hasSock = !!(currentSock || sock);
  const qrPending = !!global.currentQR;
  let status = connectionState;
  if (qrPending && status !== 'open') status = 'qr';
  if (!hasSock && status === 'disconnected') status = 'disconnected';
  return {
    connected: status === 'open',
    status,
    qrPending,
    reconnectAttempts,
    circuitOpen: Date.now() < circuitOpenUntil,
  };
}

module.exports = { connect, disconnect, getSock, getConnectionStatus };
