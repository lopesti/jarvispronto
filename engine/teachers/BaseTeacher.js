const logger = require('../utils/logger');

class BaseTeacher {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.code = config.code; // Código para ativar (ex: 1, 2, 3)
        this.icon = config.icon || '📚';
        this.description = config.description || '';
        this.levels = config.levels || ['iniciante', 'intermediario', 'avancado'];
        this.lessons = config.lessons || {};
        this.sessions = new Map();
    }

    getInfo() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            icon: this.icon,
            description: this.description,
            levels: this.levels
        };
    }

    getSession(phone) {
        if (!this.sessions.has(phone)) {
            this.sessions.set(phone, {
                active: false,
                level: 'iniciante',
                lesson: 0,
                history: []
            });
        }
        return this.sessions.get(phone);
    }

    activate(phone) {
        const session = this.getSession(phone);
        session.active = true;
        session.activatedAt = new Date();
        logger.info(this.icon + ' ' + this.name + ' ativado para ' + phone);
        return this.getWelcomeMessage();
    }

    deactivate(phone) {
        const session = this.getSession(phone);
        session.active = false;
        logger.info(this.icon + ' ' + this.name + ' desativado para ' + phone);
        return this.getGoodbyeMessage();
    }

    isActive(phone) {
        const session = this.getSession(phone);
        return session.active;
    }

    getWelcomeMessage() {
        return this.icon + ' *' + this.name + ' Ativado!*\n\n' +
            this.description + '\n\n' +
            'Comandos disponíveis:\n' +
            '📖 *lição* - Ver a lição atual\n' +
            '📝 *praticar* - Praticar exercício\n' +
            '📊 *progresso* - Ver seu progresso\n' +
            '❓ *ajuda* - Mostrar este menu\n' +
            '🔙 *sair* - Desativar o professor';
    }

    getGoodbyeMessage() {
        return this.icon + ' *' + this.name + ' desativado!*\n\n' +
            'Volte sempre para continuar seus estudos!';
    }

    getHelpMessage() {
        return this.icon + ' *Comandos do ' + this.name + ':*\n\n' +
            '📖 *lição* - Ver a lição atual\n' +
            '📝 *praticar* - Receber um exercício\n' +
            '📊 *progresso* - Ver seu progresso\n' +
            '❓ *ajuda* - Mostrar este menu\n' +
            '🔙 *sair* - Desativar o professor';
    }

    getLesson(phone) {
        const session = this.getSession(phone);
        const levelData = this.lessons[session.level];
        if (!levelData) {
            return 'Nenhuma lição disponível para este nível.';
        }

        if (session.lesson >= levelData.length) {
            // Verificar próximo nível
            const levels = Object.keys(this.lessons);
            const currentIndex = levels.indexOf(session.level);
            if (currentIndex < levels.length - 1) {
                const nextLevel = levels[currentIndex + 1];
                return '🎉 *Parabéns! Você completou o nível ' + session.level + '!*\n\n' +
                    'Próximo nível: *' + nextLevel + '*\n' +
                    'Digite *lição* para começar o próximo nível.';
            }
            return '🎉 *Parabéns! Você completou todos os níveis!*\n\n' +
                'Você é um mestre em ' + this.name + '! Continue praticando!';
        }

        const lesson = levelData[session.lesson];
        return this.formatLesson(lesson, session);
    }

    formatLesson(lesson, session) {
        return '📖 *Liçao ' + (session.lesson + 1) + ': ' + lesson.title + '*\n\n' +
            '📚 *Conteúdo:*\n' + lesson.content + '\n\n' +
            '💡 *Exemplos:*\n' + lesson.examples.map(function(e) { return '• ' + e; }).join('\n') + '\n\n' +
            '✏️ *Prática:*\n' + lesson.practice + '\n\n' +
            'Digite *praticar* para responder ao exercício.';
    }

    getProgress(phone) {
        const session = this.getSession(phone);
        const levelData = this.lessons[session.level];
        const total = levelData ? levelData.length : 0;
        
        return '📊 *Seu Progresso em ' + this.name + '*\n\n' +
            '📚 Nível: *' + session.level + '*\n' +
            '📖 Lições completas: *' + session.lesson + '/' + total + '*\n' +
            '📝 Total de lições: *' + total + '*\n' +
            '🎯 Progresso: *' + (total > 0 ? Math.round((session.lesson / total) * 100) : 0) + '%*';
    }

    async processPractice(phone, text, geminiService) {
        const session = this.getSession(phone);
        const levelData = this.lessons[session.level];
        
        if (!levelData || session.lesson >= levelData.length) {
            return '🎉 Você já completou todas as lições deste nível!';
        }

        const lesson = levelData[session.lesson];
        session.history.push({ role: 'user', content: text });

        const prompt = this.generatePrompt(lesson, text, session);
        
        try {
            const response = await geminiService.generateResponse(prompt, []);
            session.history.push({ role: 'assistant', content: response });
            
            // Verificar se o aluno entendeu
            if (text.toLowerCase().includes('entendi') || 
                text.toLowerCase().includes('sim') || 
                text.toLowerCase().includes('ok')) {
                session.lesson++;
                await this.saveProgress(phone, session.lesson, session.level);
                
                if (session.lesson >= levelData.length) {
                    return '✅ *Excelente! Você completou o nível ' + session.level + '!*\n\n' +
                        response + '\n\n' +
                        '🌟 *Parabéns! Avance para o próximo nível!*';
                }
                
                const nextLesson = levelData[session.lesson];
                return '✅ *Ótimo! Vamos para a próxima lição!*\n\n' +
                    response + '\n\n' +
                    '📖 *Próxima lição:* ' + nextLesson.title + '\n' +
                    'Digite *lição* para ver o conteúdo.';
            }
            
            return response;
        } catch (error) {
            logger.error('Erro no ' + this.name + ':', error.message);
            return 'Desculpe, estou com problemas técnicos. Tente novamente.';
        }
    }

    generatePrompt(lesson, userInput, session) {
        let historyText = '';
        for (const h of session.history) {
            historyText += h.role + ': ' + h.content + '\n';
        }
        
        return 'Você é um professor de ' + this.name + ' paciente e encorajador.\n\n' +
            'Lição atual:\n' +
            'Título: ' + lesson.title + '\n' +
            'Conteúdo: ' + lesson.content + '\n' +
            'Exemplos: ' + lesson.examples.join(', ') + '\n' +
            'Exercício: ' + lesson.practice + '\n\n' +
            'Histórico do aluno:\n' + historyText +
            'Mensagem do aluno: ' + userInput + '\n\n' +
            'Instruções:\n' +
            '1. Seja encorajador e positivo\n' +
            '2. Corrija erros de forma educada\n' +
            '3. Dê exemplos simples\n' +
            '4. Faça perguntas para praticar\n' +
            '5. Avance para a próxima lição quando o aluno demonstrar compreensão\n\n' +
            'Resposta do professor:';
    }

    async saveProgress(phone, lesson, level) {
        // Método a ser sobrescrito
    }
}

module.exports = BaseTeacher;
