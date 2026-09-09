const logger = require('../utils/logger');

const LESSONS = {
    iniciante: {
        level: 'iniciante',
        lessons: [
            {
                id: 1,
                title: 'Saudacoes',
                content: 'Hello, Hi, Good morning, Good afternoon, Good evening, Good night',
                examples: ['Hello, how are you?', 'Good morning! Nice to meet you.'],
                practice: 'Como voce cumprimenta alguem pela manha?'
            },
            {
                id: 2,
                title: 'Apresentacao Pessoal',
                content: 'My name is..., I am from..., I am a...',
                examples: ['My name is John.', 'I am from Brazil.', 'I am a student.'],
                practice: 'Como voce se apresenta em ingles?'
            },
            {
                id: 3,
                title: 'Verbos Basicos',
                content: 'To be (am, is, are), To have (have, has), To do (do, does)',
                examples: ['I am happy.', 'She has a car.', 'They do their homework.'],
                practice: 'Use o verbo to be em uma frase.'
            }
        ]
    },
    intermediario: {
        level: 'intermediario',
        lessons: [
            {
                id: 1,
                title: 'Tempos Verbais (Presente)',
                content: 'Present Simple, Present Continuous',
                examples: ['I work every day.', 'I am working now.'],
                practice: 'Qual a diferenca entre I work e I am working?'
            },
            {
                id: 2,
                title: 'Tempos Verbais (Passado)',
                content: 'Simple Past, Past Continuous',
                examples: ['I worked yesterday.', 'I was working when you called.'],
                practice: 'Como se forma o passado simples em ingles?'
            }
        ]
    }
};

function getCurrentLesson(level, lessonIndex) {
    const levelData = LESSONS[level];
    if (!levelData) return null;
    
    if (lessonIndex >= levelData.lessons.length) {
        const levels = Object.keys(LESSONS);
        const currentLevelIndex = levels.indexOf(level);
        if (currentLevelIndex < levels.length - 1) {
            const nextLevel = levels[currentLevelIndex + 1];
            return {
                lesson: LESSONS[nextLevel].lessons[0],
                level: nextLevel,
                lessonIndex: 0,
                nextLevel: true
            };
        }
        return { completed: true };
    }
    
    return {
        lesson: levelData.lessons[lessonIndex],
        level: level,
        lessonIndex: lessonIndex,
        nextLevel: false
    };
}

function generateTeacherPrompt(lesson, userInput, history) {
    let historyText = '';
    for (const h of history) {
        historyText += h.role + ': ' + h.content + '\n';
    }
    
    return 'Voce e um professor de ingles paciente e encorajador.\n\n' +
        'Licao atual:\n' +
        'Titulo: ' + lesson.title + '\n' +
        'Conteudo: ' + lesson.content + '\n' +
        'Exemplos: ' + lesson.examples.join(', ') + '\n' +
        'Exercicio: ' + lesson.practice + '\n\n' +
        'Historico do aluno:\n' + historyText +
        'Mensagem do aluno: ' + userInput + '\n\n' +
        'Instrucoes:\n' +
        '1. Seja encorajador e positivo\n' +
        '2. Corrija erros de forma educada\n' +
        '3. De exemplos simples\n' +
        '4. Faca perguntas para praticar\n' +
        '5. Avance para a proxima licao quando o aluno demonstrar compreensao\n\n' +
        'Resposta do professor:';
}

module.exports = {
    LESSONS,
    getCurrentLesson,
    generateTeacherPrompt
};
