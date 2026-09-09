const logger = require('../utils/logger');
const { query } = require('../models/database');
const geminiService = require('../services/geminiService');
const { getTeacherManager } = require('../teachers');

const teacherManager = getTeacherManager();

async function handleMessage(from, text, sock) {
    if (
        !from ||
        from.includes('@newsletter') ||
        from.includes('status@broadcast') ||
        from.includes('@broadcast')
    ) {
        logger.info('Ignorando canal/newsletter: ' + from);
        return;
    }

    if (!from.endsWith('@s.whatsapp.net') && !from.endsWith('@lid')) {
        logger.info('Ignorando grupo/outro tipo: ' + from);
        return;
    }

    const phone = from;
    const body = (text || '').trim();
    if (!body) return;

    logger.info('[whatsapp] Mensagem de ' + phone + ': ' + body);

    // VERIFICAR SE É ATIVAÇÃO DO SISTEMA DE PROFESSORES
    if (body.trim() === teacherManager.getActivationCode()) {
        logger.info('Código do sistema de professores detectado para ' + phone);
        const response = teacherManager.getTeacherListMessage();
        await sock.sendMessage(phone, { text: response });
        return;
    }

    // VERIFICAR SE O USUÁRIO ESTÁ ESCOLHENDO UM PROFESSOR
    const teacher = teacherManager.getTeacherForPhone(phone);
    if (!teacher) {
        // Tentar processar como escolha
        const choiceResult = teacherManager.processChoice(phone, body);
        if (choiceResult) {
            await sock.sendMessage(phone, { text: choiceResult });
            return;
        }
        
        // Se não for escolha válida, mostrar lista
        const listMessage = teacherManager.getTeacherListMessage();
        await sock.sendMessage(phone, { text: listMessage });
        return;
    }

    // MENSAGEM PARA O PROFESSOR ATIVO
    logger.info('Professor ativo para ' + phone + ': ' + teacher.name);
    const response = await teacherManager.processTeacherMessage(phone, body, geminiService);
    
    if (response) {
        await sock.sendMessage(phone, { text: response });
        return;
    }

    // FALLBACK (não deve acontecer)
    await sock.sendMessage(phone, { 
        text: 'Desculpe, ocorreu um erro. Tente novamente.' 
    });
}

module.exports = { handleMessage };
