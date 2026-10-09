const AgentLevel1 = require('./agents/AgentLevel1');
const AgentLevel2 = require('./agents/AgentLevel2');
const AgentLevel3 = require('./agents/AgentLevel3');
const AgentLevel4 = require('./agents/AgentLevel4');
const logger = require('../utils/logger');

class SimulationEngine {
    constructor() {
        this.agents = [];
        this.isRunning = false;
        this.intervalId = null;
        this.results = [];
        this.stats = {
            totalMessages: 0,
            totalPurchases: 0,
            activeAgents: 0
        };
    }

    initialize() {
        this.agents = [
            new AgentLevel1('agent_1'),
            new AgentLevel2('agent_2'),
            new AgentLevel3('agent_3'),
            new AgentLevel4('agent_4')
        ];
        this.stats.activeAgents = this.agents.length;
        this.results = [];
        logger.info('Simulacao inicializada com 4 agentes');
        return this.agents.map(a => a.getStatus());
    }

    start(interval = 3000) {
        if (this.isRunning) {
            logger.warn('Simulacao ja esta rodando');
            return;
        }

        this.isRunning = true;
        logger.info('Simulacao iniciada (intervalo: ' + interval + 'ms)');

        this.intervalId = setInterval(() => {
            this.step();
        }, interval);

        return this;
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        logger.info('Simulacao parada');
        return this;
    }

    async step() {
        if (!this.isRunning) return;

        const results = [];

        for (const agent of this.agents) {
            if (!agent.isActive) continue;

            const result = await agent.simulate();
            results.push(result);

            this.stats.totalMessages++;

            if (result.willBuy) {
                agent.isActive = false;
                this.stats.activeAgents--;
                this.stats.totalPurchases++;
                logger.info('Agente ' + agent.id + ' (' + agent.name + ') COMPROU!');
            }

            logger.info('[' + agent.name + '] ' + result.message);
        }

        this.results.push({
            timestamp: new Date().toISOString(),
            results: results,
            stats: { ...this.stats }
        });

        // Verificar se todos compraram
        if (this.stats.activeAgents === 0) {
            this.stop();
            logger.info('Todos os agentes compraram! Simulacao finalizada.');
        }
    }

    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            agents: this.agents.map(a => a.getStatus()),
            results: this.results.slice(-10)
        };
    }

    reset() {
        this.stop();
        this.agents = [];
        this.results = [];
        this.stats = {
            totalMessages: 0,
            totalPurchases: 0,
            activeAgents: 0
        };
        this.initialize();
        logger.info('Simulacao resetada');
        return this;
    }
}

module.exports = SimulationEngine;
