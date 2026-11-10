const BaseAgent = require('./BaseAgent');

class AgentLevel1 extends BaseAgent {
    constructor(id) {
        super(id, 1, 'Visitante', 0.1);
        this.questions = [
            'O que ? esse produto?',
            'Para que serve?',
            'Qual o pre?o?',
            '? bom mesmo?'
        ];
    }

    async simulate() {
        const msg = this.questions[Math.floor(Math.random() * this.questions.length)];
        this.messages.push(msg);
        this.conversation.push({ role: 'user', content: msg });
        
        // 10% de chance de comprar
        this.purchaseIntent = Math.random() < 0.1;
        
        return {
            message: msg,
            willBuy: this.purchaseIntent,
            level: this.level,
            consciousness: this.consciousness
        };
    }
}

module.exports = AgentLevel1;
