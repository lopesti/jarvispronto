
const axios = require('axios');
const { pickPersonas, generateCustomerReply } = require('./personas');
const { pickRandomProduto } = require('./produtos');

const JARVIS_URL = process.env.JARVIS_INTERNAL_URL || 'http://api:3000/internal';
const INTERNAL_TOKEN = process.env.INTERNAL_SIM_TOKEN;

const jarvisApi = axios.create({
    baseURL: JARVIS_URL,
    timeout: 20000,
    headers: { 'x-internal-token': INTERNAL_TOKEN },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeJid(seed) {
    const n = String(900000000 + (seed % 99999999)).padStart(9, '0');
    return `5511${n}@s.whatsapp.net`;
}

class Orchestrator {
    constructor() {
        this.run = null;
    }

    getStatus() {
        if (!this.run) return { status: 'idle' };

        return {
            id: this.run.id,
            companyId: this.run.companyId,
            status: this.run.status,
            startedAt: this.run.startedAt,
            conversations: Array.from(this.run.conversations.values()),
        };
    }

    stop() {
        if (this.run && this.run.status === 'running') {
            this.run.status = 'stopping';
        }
    }

    async start(io, { quantity, personaIds, pacingMs, maxTurns, companyId }) {
        if (this.run && ['running', 'stopping'].includes(this.run.status)) {
            throw new Error('Já existe uma simulação rodando. Pare antes de iniciar outra.');
        }

        if (!INTERNAL_TOKEN) {
            throw new Error('INTERNAL_SIM_TOKEN não configurado');
        }

        companyId = Number(companyId);

        if (!Number.isInteger(companyId) || companyId < 4 || companyId > 23) {
            throw new Error('Selecione uma empresa de demonstração válida.');
        }

        const runId = 'run_' + Date.now();
        const personas = pickPersonas(personaIds);

        this.run = {
            id: runId,
            companyId,
            status: 'running',
            startedAt: new Date().toISOString(),
            conversations: new Map(),
        };

        io.emit('run:started', this.getStatus());

        const tasks = Array.from({ length: quantity }, (_, i) =>
            this.runConversation(
                io,
                runId,
                companyId,
                i,
                personas[i % personas.length],
                { pacingMs, maxTurns }
            )
        );

        Promise.allSettled(tasks).then(() => {
            if (this.run && this.run.id === runId) {
                this.run.status = 'done';
                io.emit('run:finished', this.getStatus());
            }
        });

        return this.getStatus();
    }

    async runConversation(io, runId, companyId, index, persona, { pacingMs, maxTurns }) {
        const jid = fakeJid(Date.now() + index * 7919);

        let produto;

        const convo = {
            jid,
            companyId,
            persona: persona.label,
            produto: null,
            productId: null,
            turns: 0,
            status: 'iniciando',
            log: [],
        };

        this.run.conversations.set(jid, convo);
        io.emit('conversation:update', { runId, jid, convo });

        try {
            produto = await pickRandomProduto(companyId);

            if (!produto || !produto.id) {
                throw new Error('Produto retornado sem identificador válido');
            }

            convo.produto = produto.nome || produto.name || 'Produto';
            convo.productId = Number(produto.id);

            if (!Number.isInteger(convo.productId) || convo.productId <= 0) {
                throw new Error('Identificador do produto inválido');
            }
        } catch (err) {
            convo.status = 'erro-produto: ' + err.message;
            io.emit('conversation:update', { runId, jid, convo });
            return;
        }

        try {
            await jarvisApi.post('/simulate/reset', {
                phone: jid,
                companyId,
            });
        } catch (err) {
            convo.status = 'erro-reset: ' + (err.response?.data?.error || err.message);
            io.emit('conversation:update', { runId, jid, convo });
            return;
        }

        const history = [];

        for (let turn = 0; turn < maxTurns; turn += 1) {
            if (!this.run || this.run.id !== runId || this.run.status === 'stopping') {
                convo.status = 'parado';
                io.emit('conversation:update', { runId, jid, convo });
                break;
            }

            let customerText;

            try {
                customerText = await generateCustomerReply(persona, history, produto);
            } catch (err) {
                convo.status = 'erro-persona: ' + err.message;
                io.emit('conversation:update', { runId, jid, convo });
                break;
            }

            let jarvisText;

            try {
                const { data } = await jarvisApi.post('/simulate', {
                    from: jid,
                    text: customerText,
                    companyId,
                    productId: convo.productId,
                });

                jarvisText = data.response;
            } catch (err) {
                convo.status = 'erro-jarvis: ' + (err.response?.data?.error || err.message);
                io.emit('conversation:update', { runId, jid, convo });
                break;
            }

            convo.turns = turn + 1;
            convo.status = 'em andamento';

            convo.log.push({
                from: 'cliente',
                text: customerText,
                at: new Date().toISOString(),
            });

            convo.log.push({
                from: 'jarvis',
                text: jarvisText,
                at: new Date().toISOString(),
            });

            io.emit('conversation:update', { runId, jid, convo });

            // Histórico no formato esperado pelos providers:
            // user = mensagem do cliente
            // assistant = resposta da IA
            history.push({ role: 'user', content: customerText });

            if (jarvisText) {
                history.push({ role: 'assistant', content: jarvisText });
            }

            await sleep(pacingMs);
        }

        if (convo.status === 'em andamento') {
            convo.status = 'concluída';
        }

        io.emit('conversation:update', { runId, jid, convo });
    }
}

module.exports = new Orchestrator();
