const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const logger = require('../utils/logger');
const pino = require('pino');
const { isBlocked } = require('./blacklistService');
const { processGroupMessage } = require('./groupMonitor');

let sock = null;
let currentSock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

async function connect(onMessage) {
    const authDir = path.resolve(__dirname, '../../auth_info_jarvis');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const silentLogger = pino({ level: 'silent' });

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger,
        // Aumenta o tempo de timeout da conexão para evitar falsos positivos
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
    });

    currentSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            global.currentQR = qr;
            logger.info('[WA] QR Code atualizado. Acesse /qr para escanear.');
            qrcode.generate(qr, { small: true });
            // Reseta contador de tentativas ao gerar novo QR
            reconnectAttempts = 0;
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            // Tratamento para os códigos 401 (deslogado) e 440 (conexão substituída)
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 440;
            
            logger.warn(`[WA] Conexão encerrada. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);
            
            if (statusCode === 440) {
                logger.warn('[WA] Conexão substituída por outra instância. Tentando reconectar em 10s...');
                reconnectAttempts++;
                if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
                    setTimeout(() => connect(onMessage), 10000);
                } else {
                    logger.error('[WA] Múltiplas tentativas de reconexão falharam. Por favor, verifique se há outra instância do bot rodando.');
                }
            } else if (shouldReconnect) {
                setTimeout(() => connect(onMessage), 5000);
            } else {
                logger.error('[WA] Sessão encerrada. Remova a pasta auth_info_jarvis se quiser forçar novo QR.');
            }
        }

        if (connection === 'open') {
            logger.info('[WA] WhatsApp conectado com sucesso!');
            global.currentQR = null;
            reconnectAttempts = 0; // Reseta contador ao conectar com sucesso
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'append') {
            for (const msg of messages) {
                const ts = Number(msg.messageTimestamp || 0);
                const age = (Date.now() / 1000) - ts;
                if (age > 300) continue;
                if (msg.key?.fromMe) continue;
                if (msg.key.remoteJid === 'status@broadcast') continue;

                const from = msg.key.remoteJid;
                const isGroup = from.endsWith('@g.us');
                const text = msg.message?.conversation ||
                            msg.message?.extendedTextMessage?.text ||
                            msg.message?.imageMessage?.caption ||
                            '';
                if (!text.trim()) continue;

                if (isGroup) {
                    let groupName = from;
                    try { const meta = await sock.groupMetadata(from); groupName = meta.subject; } catch (err) {}
                    processGroupMessage(groupName, msg.key.participant || from, text);
                    continue;
                }
                if (isBlocked(from)) { logger.info(`[WA] Número bloqueado: ${from}.`); continue; }
                try { await onMessage(from, text, sock); } catch (err) { logger.error(`Erro ao processar append de ${from}:`, err.message); }
            }
            return;
        }

        if (type !== 'notify') return;
        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            if (msg.key.remoteJid === 'status@broadcast') continue;
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const text = msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        '';
            if (!text.trim()) continue;

            if (isGroup) {
                let groupName = from;
                try { const meta = await sock.groupMetadata(from); groupName = meta.subject; } catch (err) {}
                processGroupMessage(groupName, msg.key.participant || from, text);
                continue;
            }
            if (isBlocked(from)) { logger.info(`[WA] Número bloqueado: ${from}.`); continue; }
            try { await onMessage(from, text, sock); } catch (err) { logger.error(`Erro ao processar mensagem de ${from}:`, err.message); }
        }
    });

    return sock;
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

module.exports = { connect, disconnect, getSock };