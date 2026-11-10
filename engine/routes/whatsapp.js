const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');
const authMiddleware = require('../middlewares/auth');
const whatsapp = require('../services/whatsappService');
const { handleMessage } = require('../controllers/messageController');
const logger = require('../utils/logger');

const USE_QUEUE = process.env.USE_MESSAGE_QUEUE === '1';
const WORKER_URL = process.env.WORKER_INTERNAL_URL || 'http://worker:3002';
const INTERNAL_TOKEN = process.env.INTERNAL_SIM_TOKEN || '';

router.use(authMiddleware);

/**
 * BUG-072: em mode=queue o worker eh dono do socket.
 * A API delega via HTTP interno pro worker (jarvis-net).
 */
async function delegateToWorker(req, res, path, method = 'GET', body) {
  const cid = req.user.companyId;
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-company-id': String(cid),
    };
    if (INTERNAL_TOKEN) headers['x-internal-token'] = INTERNAL_TOKEN;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const r = await fetch(`${WORKER_URL}${path}`, opts);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await r.json();
      return res.status(r.status).json(data);
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(r.status).set('Content-Type', ct).send(buf);
  } catch (e) {
    logger.error(`[wa-proxy] ${path} falhou: ${e.message}`);
    res.status(502).json({ error: 'Worker indisponivel', detail: e.message });
  }
}

router.get('/status', async (req, res) => {
  if (USE_QUEUE) return delegateToWorker(req, res, '/status');
  const st = whatsapp.getState(req.user.companyId);
  res.json(st);
});

router.post('/connect', async (req, res) => {
  if (USE_QUEUE) return delegateToWorker(req, res, '/connect', 'POST', {});
  try {
    const companyId = req.user.companyId;
    await whatsapp.connectCompany(companyId, (from, text, sock, cid) =>
      handleMessage(from, text, sock, { companyId: cid || companyId })
    );
    res.json({
      message: 'Conexao iniciada para sua empresa',
      ...whatsapp.getState(companyId),
    });
  } catch (e) {
    logger.error('WA connect: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/qr', async (req, res) => {
  if (USE_QUEUE) return delegateToWorker(req, res, '/qr');
  try {
    const companyId = req.user.companyId;
    const qr = whatsapp.getQr(companyId);
    if (!qr) {
      return res.status(404).json({
        error: 'QR indisponivel',
        ...whatsapp.getState(companyId),
        hint: 'POST /api/whatsapp/connect e aguarde status qr, ou ja esta conectado',
      });
    }
    const qrImage = await qrcode.toDataURL(qr);
    res.json({ qrImage, ...whatsapp.getState(companyId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/qr-image', async (req, res) => {
  if (USE_QUEUE) return delegateToWorker(req, res, '/qr-image');
  try {
    const qr = whatsapp.getQr(req.user.companyId);
    if (!qr) return res.status(404).send('QR indisponivel');
    const buf = await qrcode.toBuffer(qr, { type: 'png' });
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  } catch (e) {
    res.status(500).send('Erro');
  }
});

router.post('/disconnect', async (req, res) => {
  if (USE_QUEUE) return delegateToWorker(req, res, '/disconnect', 'POST', req.body || {});
  try {
    const clear = req.body?.clearAuth === true;
    await whatsapp.disconnectCompany(req.user.companyId, clear);
    res.json({ message: 'WhatsApp desconectado da sua empresa', clearAuth: clear });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;