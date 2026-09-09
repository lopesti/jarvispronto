const EnglishTeacher = require('./englishTeacher');
const DockerTeacher = require('./dockerTeacher');
const PythonTeacher = require('./pythonTeacher');
const MathTeacher = require('./mathTeacher');
const logger = require('../utils/logger');

class TeacherManager {
    constructor() {
        this.teachers = [];
        this.byCode = new Map();
        this.byId = new Map();
        this.activationCode = '7777';
        this.activeTeacher = null;
        this.studentChoices = new Map(); // phone -> teacher_id
    }

    register(teacher) {
        this.teachers.push(teacher);
        this.byCode.set(teacher.code, teacher);
        this.byId.set(teacher.id, teacher);
        logger.info('Professor registrado: ' + teacher.icon + ' ' + teacher.name);
    }

    getTeachers() {
        return this.teachers.map(t => t.getInfo());
    }

    getTeacherByCode(code) {
        return this.byCode.get(code);
    }

    getTeacherById(id) {
        return this.byId.get(id);
    }

    getTeacherForPhone(phone) {
        const teacherId = this.studentChoices.get(phone);
        if (teacherId) {
            return this.byId.get(teacherId);
        }
        return null;
    }

    setTeacherForPhone(phone, teacherId) {
        this.studentChoices.set(phone, teacherId);
        return this.byId.get(teacherId);
    }

    clearTeacherForPhone(phone) {
        this.studentChoices.delete(phone);
    }

    getActivationCode() {
        return this.activationCode;
    }

    // Listar professores para o usuário
    getTeacherListMessage() {
        let message = '📚 *Lista de Professores Disponíveis*\n\n';
        message += 'Digite o *número* do professor que deseja estudar:\n\n';
        
        for (const teacher of this.teachers) {
            message += teacher.icon + ' *' + teacher.code + '* - ' + teacher.name + '\n';
            message += '   ' + teacher.description + '\n\n';
        }
        
        message += 'Digite *0* para sair.\n';
        message += 'Digite *7777* para ver esta lista novamente.';
        
        return message;
    }

    // Processar escolha do aluno
    processChoice(phone, text) {
        const choice = text.trim();
        
        if (choice === '0') {
            this.clearTeacherForPhone(phone);
            return '👋 *Saindo do sistema de professores.*\n\n' +
                'Para voltar, digite *7777* novamente.';
        }
        
        const teacher = this.getTeacherByCode(choice);
        if (teacher) {
            this.setTeacherForPhone(phone, teacher.id);
            return '✅ *Você escolheu:* ' + teacher.icon + ' ' + teacher.name + '\n\n' +
                teacher.getWelcomeMessage();
        }
        
        return '❌ *Código inválido!*\n\n' +
            'Digite o número do professor que deseja estudar:\n' +
            this.teachers.map(t => '  ' + t.icon + ' *' + t.code + '* - ' + t.name).join('\n') + '\n\n' +
            'Digite *0* para sair.';
    }

    // Processar mensagem do professor ativo
    async processTeacherMessage(phone, text, geminiService) {
        const teacher = this.getTeacherForPhone(phone);
        if (!teacher) {
            return null;
        }

        const cmd = text.trim().toLowerCase();
        const session = teacher.getSession(phone);

        if (cmd === 'sair' || cmd === 'desativar') {
            const msg = teacher.deactivate(phone);
            this.clearTeacherForPhone(phone);
            return msg;
        }

        if (cmd === 'ajuda') {
            return teacher.getHelpMessage();
        }

        if (cmd === 'licao') {
            return teacher.getLesson(phone);
        }

        if (cmd === 'progresso') {
            return teacher.getProgress(phone);
        }

        if (cmd === 'praticar') {
            // Apenas informa que o aluno deve responder ao exercício
            const lesson = teacher.getLesson(phone);
            if (lesson.includes('Prática:')) {
                return '✏️ *Responda ao exercício da lição atual!*\n\n' +
                    'Envie sua resposta para o exercício abaixo:\n\n' +
                    lesson;
            }
            return '📖 *Primeiro, veja a lição atual!*\n\n' +
                'Digite *lição* para ver o conteúdo e depois pratique.';
        }

        // Processar como prática (resposta do aluno)
        return await teacher.processPractice(phone, text, geminiService);
    }

    // Ativar professor para um número (apenas se escolheu)
    async activateTeacherForPhone(phone, teacherId) {
        const teacher = this.byId.get(teacherId);
        if (teacher) {
            const msg = teacher.activate(phone);
            this.setTeacherForPhone(phone, teacherId);
            return msg;
        }
        return null;
    }
}

// Singleton
let instance = null;

function getTeacherManager() {
    if (!instance) {
        instance = new TeacherManager();
        // Registrar professores
        instance.register(new EnglishTeacher());
        instance.register(new DockerTeacher());
        instance.register(new PythonTeacher());
        instance.register(new MathTeacher());
        logger.info('✅ ' + instance.teachers.length + ' professores registrados!');
    }
    return instance;
}

module.exports = { getTeacherManager, TeacherManager };
