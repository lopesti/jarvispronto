const BaseAgent = require('./BaseAgent');

class AgentLevel3 extends BaseAgent {
    constructor(id) {
        super(id, 3, 'Qualificado', 0.7);
        this.questions = [
            'Quero comprar, como fa?o?',
            'Qual o valor total?',
            'Aceita cart?o?',
            'Entrega em quanto tempo?'
        ];
    }

    async simulate() {
        const msg = this.questions[Math.floor(Math.random() * this.questions.length)];
        this.messages.push(msg);
        this.conversation.push({ role: 'user', content: msg });
        
        // 70% de chance de comprar
        this.purchaseIntent = Math.random() < 0.7;
        
        return {
            message: msg,
            willBuy: this.purchaseIntent,
            level: this.level,
            consciousness: this.consciousness
        };
    }
}

module.exports = AgentLevel3;
