
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
    const crypto = require('crypto');
    const expected = process.env.INTERNAL_SIM_TOKEN || '';
    const a = Buffer.from(String(token || ''));
    const b = Buffer.from(String(expected));

    if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Token interno inválido' });
    }

    next();
}

router.use(requireInternalToken);

router.post('/simulate', async (req, res) => {
    const { from, text, companyId, productId } = req.body || {};

    if (!from || !text) {
        return res.status(400).json({ error: 'from e text são obrigatórios' });
    }

    const cid = Number(companyId);
    if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ error: 'companyId é obrigatório (número válido)' });
    }

    const pid = productId == null ? null : Number(productId);

    if (productId != null && (!Number.isInteger(pid) || pid <= 0)) {
        return res.status(400).json({ error: 'productId inválido' });
    }

    try {
        if (pid !== null) {
            const produto = await Produto.findById(pid, cid);

            if (!produto) {
                return res.status(404).json({
                    error: 'Produto não pertence à empresa informada'
                });
            }
        }

        let captured = null;

        const fakeSock = {
            sendMessage: async (_jid, msg) => {
                captured = msg && msg.text ? String(msg.text) : null;
                return { key: { id: 'SIM_' + Date.now() } };
            },
        };

        await messageController.handleMessage(from, text, fakeSock, {
            companyId: cid,
            productId: pid
        });

        return res.json({
            response: captured,
            companyId: cid,
            productId: pid
        });
    } catch (err) {
        logger.error('[internal/simulate] erro: ' + err.message);
        return res.status(500).json({
            error: 'Falha ao processar mensagem simulada'
        });
    }
});

router.post('/simulate/reset', async (req, res) => {
    const { phone, companyId } = req.body || {};

    if (!phone) {
        return res.status(400).json({ error: 'phone é obrigatório' });
    }

    if (!phone.endsWith('@s.whatsapp.net') && !phone.endsWith('@lid')) {
        return res.status(400).json({
            error: 'phone precisa ser um JID válido (@s.whatsapp.net ou @lid)'
        });
    }

    const cid = Number(companyId);
    if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ error: 'companyId é obrigatório (número válido)' });
    }

    try {
        await query(
            'DELETE FROM messages WHERE phone = $1 AND company_id = $2',
            [phone, cid]
        );

        await query(
            'DELETE FROM conversations WHERE phone = $1 AND company_id = $2',
            [phone, cid]
        );

        return res.json({ ok: true, phone, companyId: cid });
    } catch (err) {
        logger.error('[internal/simulate/reset] erro: ' + err.message);
        return res.status(500).json({
            error: 'Falha ao resetar conversa simulada'
        });
    }
});

router.get('/produtos', async (req, res) => {
    const companyId = Number(req.query.companyId);

    if (!Number.isInteger(companyId) || companyId <= 0) {
        return res.status(400).json({
            error: 'companyId é obrigatório (query)'
        });
    }

    try {
        const produtos = await Produto.findAll(companyId);
        return res.json(produtos);
    } catch (err) {
        logger.error('[internal/produtos] erro: ' + err.message);
        return res.status(500).json({
            error: 'Falha ao listar produtos'
        });
    }
});

module.exports = router;
