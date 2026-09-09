const BaseTeacher = require('./BaseTeacher');

class EnglishTeacher extends BaseTeacher {
    constructor() {
        super({
            id: 'english',
            code: '1',
            name: 'Professor de Inglês',
            icon: '🇬🇧',
            description: 'Aprenda inglês do básico ao avançado com lições interativas!',
            levels: ['iniciante', 'intermediario', 'avancado'],
            lessons: {
                iniciante: [
                    {
                        title: 'Saudações',
                        content: 'Hello, Hi, Good morning, Good afternoon, Good evening, Good night',
                        examples: ['Hello, how are you?', 'Good morning! Nice to meet you.'],
                        practice: 'Como você cumprimenta alguém pela manhã?'
                    },
                    {
                        title: 'Apresentação Pessoal',
                        content: 'My name is..., I am from..., I am a...',
                        examples: ['My name is John.', 'I am from Brazil.', 'I am a student.'],
                        practice: 'Como você se apresenta em inglês?'
                    },
                    {
                        title: 'Verbos Básicos',
                        content: 'To be (am, is, are), To have (have, has), To do (do, does)',
                        examples: ['I am happy.', 'She has a car.', 'They do their homework.'],
                        practice: 'Use o verbo "to be" em uma frase.'
                    }
                ],
                intermediario: [
                    {
                        title: 'Tempos Verbais (Presente)',
                        content: 'Present Simple, Present Continuous',
                        examples: ['I work every day.', 'I am working now.'],
                        practice: 'Qual a diferença entre "I work" e "I am working"?'
                    },
                    {
                        title: 'Tempos Verbais (Passado)',
                        content: 'Simple Past, Past Continuous',
                        examples: ['I worked yesterday.', 'I was working when you called.'],
                        practice: 'Como se forma o passado simples em inglês?'
                    }
                ]
            }
        });
    }

    async saveProgress(phone, lesson, level) {
        // Salvar no banco
        const { query } = require('../models/database');
        try {
            await query(
                'INSERT INTO teacher_progress (phone, teacher_id, lesson, level, updated_at) VALUES (, , , , NOW()) ON CONFLICT (phone, teacher_id) DO UPDATE SET lesson = , level = , updated_at = NOW()',
                [phone, this.id, lesson, level]
            );
        } catch (error) {
            logger.error('Erro ao salvar progresso:', error.message);
        }
    }
}

module.exports = EnglishTeacher;
