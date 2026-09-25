const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { query } = require('../models/database');
const messageController = require('../controllers/messageController');
const Produto = require('../models/produto');

/**
 * Token interno simples (máquina-a-máquina), NÃO é o JWT de usuário do painel.
 * Só protege quem pode injetar mensagens simuladas no funil real.
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

/**
 * POST /internal/simulate
 * Body: { from: "5511900000001@s.whatsapp.net", text: "Oi, quanto custa?" }
 *
 * Chama EXATAMENTE o mesmo messageController.handleMessage(from, text, sock)
 * que o Baileys chamaria numa mensagem real — mesma validação, mesmo banco,
 * mesma IA, mesmo funil. O único componente trocado é o "sock": em vez de
 * mandar pro WhatsApp de verdade, ele só captura o texto da resposta.
 */
router.post('/simulate', async (req, res) => {
    const { from, text } = req.body || {};
    if (!from || !text) {
        return res.status(400).json({ error: 'from e text são obrigatórios' });
    }

    let captured = null;
    const fakeSock = {
        sendMessage: async (_jid, msg) => {
            captured = msg && msg.text ? String(msg.text) : null;
            return { key: { id: 'SIM_' + Date.now() } };
        },
    };

    try {
        await messageController.handleMessage(from, text, fakeSock);
        return res.json({ response: captured });
    } catch (err) {
        logger.error('[internal/simulate] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao processar mensagem simulada' });
    }
});

/**
 * POST /internal/simulate/reset
 * Body: { phone: "5511900000001@s.whatsapp.net" }
 *
 * Apaga o histórico (conversations + messages) daquele "phone" simulado,
 * pra próxima rodada começar do zero, como se fosse um lead novo chegando.
 * Trava por sufixo de JID pra nunca resetar um número real por engano.
 */
router.post('/simulate/reset', async (req, res) => {
    const { phone } = req.body || {};
    if (!phone) {
        return res.status(400).json({ error: 'phone é obrigatório' });
    }
    if (!phone.endsWith('@s.whatsapp.net') && !phone.endsWith('@lid')) {
        return res.status(400).json({ error: 'phone precisa ser um JID válido (@s.whatsapp.net ou @lid)' });
    }

    try {
        await query('DELETE FROM messages WHERE phone = $1', [phone]);
        await query('DELETE FROM conversations WHERE phone = $1', [phone]);
        return res.json({ ok: true });
    } catch (err) {
        logger.error('[internal/simulate/reset] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao resetar conversa simulada' });
    }
});

/**
 * GET /internal/produtos
 * Expõe o catálogo real (os mesmos 50 produtos cadastrados) pro simulador
 * poder gerar personas que perguntam por itens específicos de verdade.
 */
router.get('/produtos', async (req, res) => {
    try {
        const produtos = await Produto.findAll();
        return res.json(produtos);
    } catch (err) {
        logger.error('[internal/produtos] erro: ' + err.message);
        return res.status(500).json({ error: 'Falha ao listar produtos' });
    }
});

module.exports = router;
