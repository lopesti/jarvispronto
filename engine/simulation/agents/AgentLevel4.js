const BaseAgent = require('./BaseAgent');

class AgentLevel4 extends BaseAgent {
    constructor(id) {
        super(id, 4, 'Comprador', 0.95);
        this.questions = [
            'Quero finalizar minha compra',
            'J? decidi, vou comprar',
            'Meu endere?o ? Rua X, 123',
            'Faz a entrega hoje?'
        ];
    }

    async simulate() {
        const msg = this.questions[Math.floor(Math.random() * this.questions.length)];
        this.messages.push(msg);
        this.conversation.push({ role: 'user', content: msg });
        
        // 95% de chance de comprar (quase sempre)
        this.purchaseIntent = Math.random() < 0.95;
        
        return {
            message: msg,
            willBuy: this.purchaseIntent,
            level: this.level,
            consciousness: this.consciousness
        };
    }
}

module.exports = AgentLevel4;
