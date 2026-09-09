const logger = require('../utils/logger');
const teacherService = require('./teacherService');
const lessonService = require('./lessonService');
const geminiService = require('./geminiService');

async function handleTeacherMessage(phone, text, sock) {
    const session = teacherService.getSession(phone);
    
    if (text.trim() === teacherService.ACTIVATION_CODE) {
        if (await teacherService.canActivate(phone)) {
            await teacherService.activateTeacher(phone);
            return 'Professor de Ingles Ativado!\n\nOla! Sou seu professor de ingles. Vamos comecar?\n\nDigite "licao" para ver a licao atual.\nDigite "ajuda" para ver os comandos disponiveis.\nDigite "sair" para encerrar.';
        } else {
            return 'Codigo invalido ou voce nao tem permissao para ativar o professor.';
        }
    }
    
    if (!(await teacherService.isActive(phone))) {
        return 'Professor de Ingles\n\nPara ativar o professor, digite o codigo: ' + teacherService.ACTIVATION_CODE;
    }
    
    const cmd = text.trim().toLowerCase();
    
    if (cmd === 'sair' || cmd === 'desativar') {
        session.active = false;
        return 'Professor desativado!\n\nDigite o codigo novamente para reativar.';
    }
    
    if (cmd === 'ajuda') {
        return 'Comandos do Professor:\n\nlicao - Ver a licao atual\npraticar - Receber um exercicio\nprogresso - Ver seu progresso\nsair - Desativar o professor\najuda - Mostrar este menu';
    }
    
    if (cmd === 'licao') {
        const current = lessonService.getCurrentLesson(session.level, session.lesson);
        
        if (current.completed) {
            return 'Parabens! Voce concluiu todas as licoes!\n\nVoce e um mestre do ingles! Continue praticando.';
        }
        
        const lesson = current.lesson;
        return 'Licao ' + lesson.id + ': ' + lesson.title + '\n\n' +
            'Conteudo:\n' + lesson.content + '\n\n' +
            'Exemplos:\n' + lesson.examples.map(function(e) { return '• ' + e; }).join('\n') + '\n\n' +
            'Pratica:\n' + lesson.practice + '\n\n' +
            'Digite "praticar" para responder ao exercicio.';
    }
    
    if (cmd === 'progresso') {
        return 'Seu Progresso:\n\nNivel: ' + session.level + '\nLicoes completas: ' + session.lesson + '\nTotal de licoes: ' + (lessonService.LESSONS[session.level]?.lessons.length || 0);
    }
    
    return await processStudentPractice(phone, text, session);
}

async function processStudentPractice(phone, text, session) {
    const current = lessonService.getCurrentLesson(session.level, session.lesson);
    if (current.completed) {
        return 'Voce ja completou todas as licoes!';
    }
    
    const lesson = current.lesson;
    session.history.push({ role: 'user', content: text });
    
    const prompt = lessonService.generateTeacherPrompt(lesson, text, session.history);
    
    try {
        const response = await geminiService.generateResponse(prompt, []);
        session.history.push({ role: 'assistant', content: response });
        
        if (text.toLowerCase().includes('entendi') || text.toLowerCase().includes('sim')) {
            session.lesson++;
            await teacherService.updateProgress(phone, session.lesson, session.level);
            
            const next = lessonService.getCurrentLesson(session.level, session.lesson);
            if (next.completed) {
                return 'Excelente! Voce completou o nivel ' + session.level + '!\n\n' + response + '\n\nParabens! Avance para o proximo nivel!';
            }
            
            return 'Otimo! Vamos para a proxima licao!\n\n' + response + '\n\nProxima licao: ' + next.lesson.title + '\n\nDigite "licao" para ver o conteudo.';
        }
        
        return response;
    } catch (error) {
        logger.error('Erro no professor:', error.message);
        return 'Desculpe, estou com problemas tecnicos. Tente novamente.';
    }
}

module.exports = {
    handleTeacherMessage
};
