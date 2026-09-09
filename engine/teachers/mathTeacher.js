const BaseTeacher = require('./BaseTeacher');

class MathTeacher extends BaseTeacher {
    constructor() {
        super({
            id: 'math',
            code: '4',
            name: 'Professor de Matemática',
            icon: '📐',
            description: 'Aprenda matemática do básico ao avançado com exercícios práticos!',
            levels: ['iniciante', 'intermediario', 'avancado'],
            lessons: {
                iniciante: [
                    {
                        title: 'Operações Básicas',
                        content: 'Adição, subtração, multiplicação, divisão, potenciação e radiciação.',
                        examples: ['2 + 2 = 4', '10 - 3 = 7', '4 * 5 = 20', '15 / 3 = 5', '2^3 = 8', '√25 = 5'],
                        practice: 'Qual o resultado de 15 + 27?'
                    },
                    {
                        title: 'Frações e Decimais',
                        content: 'Frações representam partes de um todo. Decimais são frações com denominador 10, 100, 1000...',
                        examples: ['1/2 = 0.5', '3/4 = 0.75', '2/3 ≈ 0.666...', '0.25 = 25/100 = 1/4'],
                        practice: 'Qual o valor decimal de 3/5?'
                    },
                    {
                        title: 'Porcentagens',
                        content: 'Porcentagem é uma fração com denominador 100. Representa "por cento" (%).',
                        examples: ['10% de 100 = 10', '25% de 200 = 50', '50% de 80 = 40', '75% de 120 = 90'],
                        practice: 'Quanto é 20% de 150?'
                    }
                ],
                intermediario: [
                    {
                        title: 'Equações do 1º Grau',
                        content: 'Equações do 1º grau são expressões matemáticas com uma variável de grau 1.',
                        examples: ['2x + 3 = 7', 'x = 2', '3x - 5 = 10', 'x = 5'],
                        practice: 'Resolva a equação: 4x + 6 = 18'
                    }
                ]
            }
        });
    }

    async saveProgress(phone, lesson, level) {
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

module.exports = MathTeacher;
