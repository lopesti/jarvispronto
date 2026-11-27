class BaseAgent {
    constructor(id, level, name, consciousness) {
        this.id = id;
        this.level = level;
        this.name = name;
        this.consciousness = consciousness;
        this.isActive = true;
        this.messages = [];
        this.conversation = [];
        this.purchaseIntent = false;
    }

    getStatus() {
        return {
            id: this.id,
            level: this.level,
            name: this.name,
            consciousness: this.consciousness,
            isActive: this.isActive,
            messagesCount: this.messages.length,
            purchaseIntent: this.purchaseIntent
        };
    }

    async simulate(question) {
        // M?todo a ser sobrescrito
        return {
            message: '...',
            willBuy: false
        };
    }
}

module.exports = BaseAgent;
