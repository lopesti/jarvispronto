const express = require('express');
const router = express.Router();
const SimulationEngine = require('../simulation/SimulationEngine');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════
//  BUG-024 — SimulationEngine por tenant
//  Antes: singleton global (todas as companies compartilhavam)
//  Agora: Map<companyId, SimulationEngine>
// ═══════════════════════════════════════════════════════════

const engines = new Map(); // companyId -> SimulationEngine

function getCompanyId(req, res) {
    const cid = Number(req.user && req.user.companyId);
    if (!cid || Number.isNaN(cid)) {
        res.status(403).json({ error: 'Usuario sem empresa vinculada' });
        return null;
    }
    return cid;
}

function getEngine(companyId) {
    let engine = engines.get(companyId);
    if (!engine) {
        engine = new SimulationEngine();
        engine.initialize();
        engines.set(companyId, engine);
        logger.info(`[simulation] Engine criado company=${companyId}`);
    }
    return engine;
}

router.post('/start', (req, res) => {
    const cid = getCompanyId(req, res);
    if (!cid) return;

    const speed = req.body.speed || 3000;
    const engine = getEngine(cid);
    engine.start(speed);

    res.json({
        success: true,
        message: 'Simulacao iniciada',
        speed: speed,
        companyId: cid,
        agents: engine.agents.map((a) => a.getStatus()),
    });
});

router.post('/stop', (req, res) => {
    const cid = getCompanyId(req, res);
    if (!cid) return;

    const engine = getEngine(cid);
    engine.stop();
    res.json({ success: true, message: 'Simulacao parada', companyId: cid });
});

router.post('/reset', (req, res) => {
    const cid = getCompanyId(req, res);
    if (!cid) return;

    const engine = getEngine(cid);
    engine.reset();
    res.json({ success: true, message: 'Simulacao resetada', companyId: cid });
});

router.get('/status', (req, res) => {
    const cid = getCompanyId(req, res);
    if (!cid) return;

    const engine = getEngine(cid);
    res.json({ ...engine.getStats(), companyId: cid });
});

module.exports = router;