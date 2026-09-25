const express = require('express');
const router = express.Router();
const SimulationEngine = require('../simulation/SimulationEngine');

let engine = null;

function getEngine() {
    if (!engine) {
        engine = new SimulationEngine();
        engine.initialize();
    }
    return engine;
}

router.post('/start', (req, res) => {
    const speed = req.body.speed || 3000;
    const engine = getEngine();
    engine.start(speed);
    res.json({
        success: true,
        message: 'Simulacao iniciada',
        speed: speed,
        agents: engine.agents.map(a => a.getStatus())
    });
});

router.post('/stop', (req, res) => {
    const engine = getEngine();
    engine.stop();
    res.json({ success: true, message: 'Simulacao parada' });
});

router.post('/reset', (req, res) => {
    const engine = getEngine();
    engine.reset();
    res.json({ success: true, message: 'Simulacao resetada' });
});

router.get('/status', (req, res) => {
    const engine = getEngine();
    res.json(engine.getStats());
});

module.exports = router;
