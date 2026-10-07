/**
 * Mini servidor HTTP interno do worker (BUG-072).
 *
 * Em USE_MESSAGE_QUEUE=1, a API NAO abre socket WA — apenas o worker.
 * A API delega as chamadas de WhatsApp pra este servidor via HTTP interno.
 *
 * Nao exposto ao host. So acessivel dentro da rede docker jarvis-net.
 * Autenticacao: header x-internal-token === INTERNAL_SIM_TOKEN.
 */
const express = require('express');
const qrcode = require('qrcode');
const logger = require('../utils/logger');
const whatsapp = require('../services/whatsappService');
const { handleMessage } = require('../controllers/messageController');

const PORT = Number(process.env.WORKER_HTTP_PORT) || 3002;
const INTERNAL_TOKEN = process.env.INTERNAL_SIM_TOKEN || '';

function authCheck(req, res, next) {
  if (!INTERNAL_TOKEN) return next(); // dev sem token
  const got = req.headers['x-internal-token'];
  if (got !== INTERNAL_TOKEN) {
    return res.status(401).json({ error: 'Token interno invalido' });
  }
  next();
}

function companyIdFromReq(req) {
  const cid = Number(req.headers['x-company-id'] || req.query.companyId || req.body?.companyId);
  return cid && !Number.isNaN(cid) ? cid : null;
}

async function startWorkerHttp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ─── Rota pública de healthcheck (Docker/K8s) — NÃO exige token ───
  // Precisa vir ANTES do authCheck. BUG-073: healthcheck do worker.
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  // ─── Daqui pra baixo tudo exige token interno ───
  app.use(authCheck);

  app.get('/status', (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).json({ error: 'companyId obrigatorio' });
    res.json({ ...whatsapp.getState(cid), companyId: cid });
  });

  app.post('/connect', async (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).json({ error: 'companyId obrigatorio' });
    try {
      await whatsapp.connectCompany(cid, (from, text, sock, companyId) =>
        handleMessage(from, text, sock, { companyId: companyId || cid })
      );
      res.json({ message: 'Conexao iniciada no worker', ...whatsapp.getState(cid), companyId: cid });
    } catch (e) {
      logger.error(`[worker-http] connect(${cid}): ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/qr', async (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).json({ error: 'companyId obrigatorio' });
    const qr = whatsapp.getQr(cid);
    if (!qr) {
      return res.status(404).json({
        error: 'QR indisponivel',
        ...whatsapp.getState(cid),
        companyId: cid,
        hint: 'POST /connect e aguarde status qr',
      });
    }
    const qrImage = await qrcode.toDataURL(qr);
    res.json({ qrImage, ...whatsapp.getState(cid), companyId: cid });
  });

  app.get('/qr-image', async (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).send('companyId obrigatorio');
    const qr = whatsapp.getQr(cid);
    if (!qr) return res.status(404).send('QR indisponivel');
    const buf = await qrcode.toBuffer(qr, { type: 'png' });
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  });

  app.post('/disconnect', async (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).json({ error: 'companyId obrigatorio' });
    try {
      const clear = req.body?.clearAuth === true;
      await whatsapp.disconnectCompany(cid, clear);
      res.json({ message: 'Desconectado', clearAuth: clear, companyId: cid });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/send', async (req, res) => {
    const cid = companyIdFromReq(req);
    if (!cid) return res.status(400).json({ error: 'companyId obrigatorio' });
    const { phone, text } = req.body || {};
    if (!phone || !text) return res.status(400).json({ error: 'phone e text obrigatorios' });
    try {
      const sock = whatsapp.getSock(cid);
      if (!sock) return res.status(503).json({ error: 'Socket indisponivel para este tenant' });
      await sock.sendMessage(phone, { text: String(text) });
      res.json({ ok: true });
    } catch (e) {
      logger.error(`[worker-http] send(${cid}): ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  return new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`[worker-http] Servidor interno ouvindo em :${PORT}`);
      resolve();
    });
  });
}

module.exports = { startWorkerHttp };