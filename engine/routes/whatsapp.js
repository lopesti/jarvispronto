const express = require('express');
const router = express.Router();
const qrcode = require('qrcode');
const authMiddleware = require('../middlewares/auth');
const whatsapp = require('../services/whatsappService');
const { handleMessage } = require('../controllers/messageController');
const logger = require('../utils/logger');

router.use(authMiddleware);

router.get('/status', (req, res) => {
  const st = whatsapp.getState(req.user.companyId);
  res.json(st);
});

router.post('/connect', async (req, res) => {
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
  try {
    const clear = req.body?.clearAuth === true;
    await whatsapp.disconnectCompany(req.user.companyId, clear);
    res.json({ message: 'WhatsApp desconectado da sua empresa', clearAuth: clear });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
