const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const pino = require('pino');
const { isBlocked } = require('./blacklistService');
const { processGroupMessage } = require('./groupMonitor');

/** @type {Map<number, { sock: any, qr: string|null, state: string, reconnectAttempts: number }>} */
const sessions = new Map();

const BASE_AUTH =
  process.env.WA_AUTH_DIR ||
  path.resolve(__dirname, '../../auth_info_jarvis');

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 5 * 60 * 1000;
const MAX_RECONNECT = 8;

function authDirFor(companyId) {
  const dir = path.join(BASE_AUTH, `company_${companyId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSession(companyId) {
  const id = Number(companyId);
  if (!sessions.has(id)) {
    sessions.set(id, {
      sock: null,
      qr: null,
      state: 'disconnected',
      reconnectAttempts: 0,
      onMessage: null,
    });
  }
  return sessions.get(id);
}

function nextDelayMs(attempt) {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * Math.min(1000, exp * 0.2));
  return exp + jitter;
}

/**
 * Conecta (ou reconecta) WhatsApp da empresa.
 * @param {number} companyId
 * @param {function} onMessage (from, text, sock, companyId) => void
 */
async function connectCompany(companyId, onMessage) {
  const id = Number(companyId);
  if (!id || Number.isNaN(id)) {
    throw new Error('companyId invalido');
  }

  const session = getSession(id);
  if (onMessage) session.onMessage = onMessage;

  if (session.sock && session.state === 'open') {
    logger.info(`[WA][company=${id}] Ja conectado`);
    return session.sock;
  }

  const authDir = authDirFor(id);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const silentLogger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: silentLogger,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  session.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      session.qr = qr;
      session.state = 'qr';
      // legado: so espelha se for a unica sessao em QR
      global.currentQR = qr;
      global.currentQRCompanyId = id;
      logger.info(`[WA][company=${id}] QR atualizado. GET /api/whatsapp/qr`);
      try {
        qrcode.generate(qr, { small: true });
      } catch (_) {}
      session.reconnectAttempts = 0;
    }

    if (connection === 'connecting') {
      session.state = 'connecting';
    }

    if (connection === 'open') {
      session.state = 'open';
      session.qr = null;
      if (global.currentQRCompanyId === id) global.currentQR = null;
      session.reconnectAttempts = 0;
      logger.info(`[WA][company=${id}] WhatsApp conectado`);
    }

    if (connection === 'close') {
      session.state = 'close';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const replaced = statusCode === 440;

      logger.warn(
        `[WA][company=${id}] Conexao encerrada. Codigo: ${statusCode}. Logout: ${loggedOut}`
      );

      if (loggedOut) {
        session.sock = null;
        session.qr = null;
        // limpa credenciais para forcar novo QR
        try {
          for (const f of fs.readdirSync(authDir)) {
            fs.unlinkSync(path.join(authDir, f));
          }
        } catch (_) {}
        return;
      }

      if (session.reconnectAttempts >= MAX_RECONNECT) {
        logger.error(`[WA][company=${id}] Limite de reconexao atingido`);
        return;
      }

      session.reconnectAttempts += 1;
      const delay = nextDelayMs(session.reconnectAttempts);
      logger.info(`[WA][company=${id}] Reconectando em ${Math.round(delay / 1000)}s`);
      setTimeout(() => {
        connectCompany(id, session.onMessage).catch((e) =>
          logger.error(`[WA][company=${id}] Reconnect fail: ${e.message}`)
        );
      }, replaced ? Math.max(delay, 10000) : delay);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' && type !== 'append') return;
    const handler = session.onMessage;
    if (!handler) return;

    for (const msg of messages) {
      try {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from || from === 'status@broadcast') continue;

        const isGroup = from.endsWith('@g.us');
        let text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';
        if (!String(text).trim()) continue;

        if (isGroup) {
          try {
            const meta = await sock.groupMetadata(from);
            processGroupMessage(meta.subject || from, msg.key.participant || from, text);
          } catch (_) {}
          continue;
        }

        if (isBlocked(from)) {
          logger.info(`[WA][company=${id}] Bloqueado: ${from}`);
          continue;
        }

        await handler(from, text, sock, id);
      } catch (err) {
        logger.error(`[WA][company=${id}] Erro mensagem: ${err.message}`);
      }
    }
  });

  return sock;
}

function getQr(companyId) {
  return getSession(companyId).qr || null;
}

function getState(companyId) {
  const s = getSession(companyId);
  return {
    companyId: Number(companyId),
    state: s.state,
    connected: s.state === 'open',
    hasQr: Boolean(s.qr),
  };
}

function getSock(companyId) {
  return getSession(companyId).sock;
}

async function disconnectCompany(companyId, clearAuth = false) {
  const id = Number(companyId);
  const session = getSession(id);
  try {
    if (session.sock) {
      await session.sock.logout().catch(() => {});
      session.sock.end?.();
    }
  } catch (_) {}
  session.sock = null;
  session.qr = null;
  session.state = 'disconnected';

  if (clearAuth) {
    const dir = authDirFor(id);
    try {
      for (const f of fs.readdirSync(dir)) {
        fs.unlinkSync(path.join(dir, f));
      }
    } catch (_) {}
  }
  return true;
}

/** Compat: connect sem company usa empresa 1 (legado) */
async function connect(onMessage) {
  return connectCompany(1, (from, text, sock) => onMessage(from, text, sock));
}

function disconnect() {
  return disconnectCompany(1, false);
}

module.exports = {
  connect,
  connectCompany,
  disconnect,
  disconnectCompany,
  getQr,
  getState,
  getSock,
  getSession,
};
