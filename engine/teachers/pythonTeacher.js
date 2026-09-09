const BaseTeacher = require('./BaseTeacher');

class PythonTeacher extends BaseTeacher {
    constructor() {
        super({
            id: 'python',
            code: '3',
            name: 'Professor de Python',
            icon: '🐍',
            description: 'Aprenda Python do básico ao avançado com exemplos práticos!',
            levels: ['iniciante', 'intermediario', 'avancado'],
            lessons: {
                iniciante: [
                    {
                        title: 'Introdução ao Python',
                        content: 'Python é uma linguagem de programação de alto nível, interpretada e de propósito geral.',
                        examples: ['print("Olá, mundo!")', 'nome = input("Digite seu nome: ")', 'print(f"Olá, {nome}!")'],
                        practice: 'Como você exibe uma mensagem na tela em Python?'
                    },
                    {
                        title: 'Variáveis e Tipos',
                        content: 'Python tem tipos dinâmicos: int, float, str, bool, list, tuple, dict, set.',
                        examples: ['idade = 25', 'nome = "João"', 'lista = [1, 2, 3]', 'dicionario = {"nome": "João", "idade": 25}'],
                        practice: 'Qual a diferença entre uma lista e uma tupla em Python?'
                    },
                    {
                        title: 'Estruturas de Controle',
                        content: 'if, elif, else, for, while são usados para controle de fluxo.',
                        examples: ['if idade >= 18: print("Maior de idade")', 'for i in range(5): print(i)', 'while True: break'],
                        practice: 'Como você cria um loop que executa 5 vezes em Python?'
                    }
                ],
                intermediario: [
                    {
                        title: 'Funções em Python',
                        content: 'Funções são blocos de código reutilizáveis definidos com def.',
                        examples: ['def saudacao(nome): return f"Olá, {nome}!"', 'resultado = saudacao("João")', 'print(resultado)'],
                        practice: 'Como você define uma função que recebe dois números e retorna a soma?'
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

module.exports = PythonTeacher;
