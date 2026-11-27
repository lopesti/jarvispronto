require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const orchestrator = require('./lib/orchestrator');
const { getPersonaPool } = require('./lib/personas');
const aiPool = require('./lib/aiPool');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/personas', (_req, res) => {
    res.json(getPersonaPool());
});

app.get('/api/status', (_req, res) => {
    res.json({ ...orchestrator.getStatus(), aiPoolSize: aiPool.poolSize() });
});

app.post('/api/run', async (req, res) => {
    const {
        companyId,
        quantity = 5,
        personaIds = [],
        pacingMs = 1500,
        maxTurns = 6,
    } = req.body || {};

    const company = Number(companyId);

    if (!Number.isInteger(company) || company < 4 || company > 23) {
        return res.status(400).json({
            error: 'Selecione uma empresa de demonstração válida.'
        });
    }

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 200);
    const turns = Math.min(Math.max(parseInt(maxTurns, 10) || 1, 1), 20);
    const pacing = Math.min(Math.max(parseInt(pacingMs, 10) || 500, 300), 15000);

    try {
        const status = await orchestrator.start(io, {
            companyId: company,
            quantity: qty,
            personaIds,
            pacingMs: pacing,
            maxTurns: turns,
        });
        res.json(status);
    } catch (err) {
        res.status(409).json({ error: err.message });
    }
});

app.post('/api/stop', (_req, res) => {
    orchestrator.stop();
    res.json({ ok: true });
});

io.on('connection', (socket) => {
    socket.emit('run:status', orchestrator.getStatus());
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`[jarvis-simulator] rodando em http://0.0.0.0:${PORT}`);
    console.log(`[jarvis-simulator] falando com Jarvis em ${process.env.JARVIS_INTERNAL_URL}`);
});
