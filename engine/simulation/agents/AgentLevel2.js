const BaseAgent = require('./BaseAgent');

class AgentLevel2 extends BaseAgent {
    constructor(id) {
        super(id, 2, 'Interessado', 0.4);
        this.questions = [
            'Quero saber mais sobre o produto',
            'Quais os benef?cios?',
            'Como funciona?',
            'Tem garantia?'
        ];
    }

    async simulate() {
        const msg = this.questions[Math.floor(Math.random() * this.questions.length)];
        this.messages.push(msg);
        this.conversation.push({ role: 'user', content: msg });
        
        // 40% de chance de comprar
        this.purchaseIntent = Math.random() < 0.4;
        
        return {
            message: msg,
            willBuy: this.purchaseIntent,
            level: this.level,
            consciousness: this.consciousness
        };
    }
}

module.exports = AgentLevel2;
