const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { query } = require('../models/database');
const messageController = require('../controllers/messageController');
const Produto = require('../models/produto');

/**
 * Token interno simples (máquina-a-máquina), NÃO é o JWT de usuário do painel.
 */
function requireInternalToken(req, res, next) {
    if (!process.env.INTERNAL_SIM_TOKEN) {
        logger.error('[internal] INTERNAL_SIM_TOKEN não configurado no .env — rota desabilitada');
        return res.status(503).json({ error: 'Simulador desabilitado (token não configurado)' });
    }
    const token = req.headers['x-internal-token'];
    if (!token || token !== process.env.INTERNAL_SIM_TOKEN) {
        return res.status(401).json({ error: 'Token interno inválido' });
    }
    next();
}

router.use(requireInternalToken);

router.post('/simulate', async (req, res) => {
    const { from, text, companyId } = req.body || {};
    if (!from || !text) {
        return res.status(400).json({ error: 'from e text são obrigatórios' });
    }
    if (!companyId || Number.isNaN(Number(companyId))) {
        return res.status(400).json({ error: 'companyId é obrigatório (número)' });
    }

    let captured = null;
    const fakeSock = {
        sendMessage: async (_jid, msg) => {
            captured = msg && msg.text ? String(msg.text) : null;
            return { key: { id: 'SIM_' + Date.now() } };
        },
    };

    try {
        await messageController.handleMessage(from, text, fakeSock, { companyId: Number(companyId) });
        return res.json({ response: captured, companyId: Number(companyId) });
    } catch (err) {
        logger.error('[internal/simulate] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao processar mensagem simulada' });
    }
});

router.post('/simulate/reset', async (req, res) => {
    const { phone, companyId } = req.body || {};
    if (!phone) {
        return res.status(400).json({ error: 'phone é obrigatório' });
    }
    if (!phone.endsWith('@s.whatsapp.net') && !phone.endsWith('@lid')) {
        return res.status(400).json({ error: 'phone precisa ser um JID válido (@s.whatsapp.net ou @lid)' });
    }
    if (!companyId || Number.isNaN(Number(companyId))) {
        return res.status(400).json({ error: 'companyId é obrigatório (número)' });
    }
    try {
        await query('DELETE FROM messages WHERE phone = $1 AND company_id = $2', [phone, Number(companyId)]);
        await query('DELETE FROM conversations WHERE phone = $1 AND company_id = $2', [phone, Number(companyId)]);
        return res.json({ ok: true, phone, companyId: Number(companyId) });
    } catch (err) {
        logger.error('[internal/simulate/reset] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao resetar conversa simulada' });
    }
});

router.get('/produtos', async (req, res) => {
    const companyId = Number(req.query.companyId);
    if (!companyId || Number.isNaN(companyId)) {
        return res.status(400).json({ error: 'companyId é obrigatório (query)' });
    }
    try {
        const produtos = await Produto.findAll(companyId);
        return res.json(produtos);
    } catch (err) {
        logger.error('[internal/produtos] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao listar produtos' });
    }
});

module.exports = router;
