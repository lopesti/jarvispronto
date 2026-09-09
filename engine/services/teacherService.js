const { query } = require('../models/database');
const logger = require('../utils/logger');

const ACTIVATION_CODE = '7777';
// SUBSTITUA PELO SEU NÚMERO DO WHATSAPP (sem @lid)
const TEACHER_PHONE = '57540264099988';

const studentSessions = new Map();

async function canActivate(phone) {
    // Remove @lid e @s.whatsapp.net para comparação
    const cleanPhone = phone.replace(/@.*$/, '');
    return cleanPhone === TEACHER_PHONE;
}

async function activateTeacher(phone) {
    if (!studentSessions.has(phone)) {
        studentSessions.set(phone, {
            active: false,
            level: 'iniciante',
            lesson: 0,
            history: []
        });
    }
    
    const session = studentSessions.get(phone);
    session.active = true;
    session.activatedAt = new Date();
    
    try {
        await query(
            'INSERT INTO teacher_activations (phone, activated_at) VALUES (, NOW()) ON CONFLICT (phone) DO UPDATE SET activated_at = NOW()',
            [phone]
        );
    } catch (error) {
        logger.error('Erro ao salvar ativação:', error.message);
    }
    
    logger.info('Professor ativado para ' + phone);
    return true;
}

async function isActive(phone) {
    const session = studentSessions.get(phone);
    if (session && session.active) return true;
    
    try {
        const result = await query(
            'SELECT * FROM teacher_activations WHERE phone =  AND activated_at > NOW() - INTERVAL \'7 days\'',
            [phone]
        );
        
        if (result.rows.length > 0) {
            if (!studentSessions.has(phone)) {
                studentSessions.set(phone, {
                    active: true,
                    level: 'iniciante',
                    lesson: 0,
                    history: []
                });
            }
            studentSessions.get(phone).active = true;
            return true;
        }
    } catch (error) {
        logger.error('Erro ao verificar ativação:', error.message);
    }
    
    return false;
}

function getSession(phone) {
    if (!studentSessions.has(phone)) {
        studentSessions.set(phone, {
            active: false,
            level: 'iniciante',
            lesson: 0,
            history: []
        });
    }
    return studentSessions.get(phone);
}

async function updateProgress(phone, lesson, level) {
    const session = getSession(phone);
    session.lesson = lesson;
    session.level = level;
    
    try {
        await query(
            'INSERT INTO teacher_progress (phone, lesson, level, updated_at) VALUES (, , , NOW()) ON CONFLICT (phone) DO UPDATE SET lesson = , level = , updated_at = NOW()',
            [phone, lesson, level]
        );
    } catch (error) {
        logger.error('Erro ao atualizar progresso:', error.message);
    }
}

module.exports = {
    ACTIVATION_CODE,
    TEACHER_PHONE,
    canActivate,
    activateTeacher,
    isActive,
    getSession,
    updateProgress
};
