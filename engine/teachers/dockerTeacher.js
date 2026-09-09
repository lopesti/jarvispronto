const BaseTeacher = require('./BaseTeacher');

class DockerTeacher extends BaseTeacher {
    constructor() {
        super({
            id: 'docker',
            code: '2',
            name: 'Professor de Docker',
            icon: '🐳',
            description: 'Aprenda Docker e containerização do zero ao avançado!',
            levels: ['iniciante', 'intermediario', 'avancado'],
            lessons: {
                iniciante: [
                    {
                        title: 'O que é Docker?',
                        content: 'Docker é uma plataforma de containerização que permite empacotar aplicações e suas dependências em containers isolados.',
                        examples: ['docker run hello-world', 'docker ps', 'docker images'],
                        practice: 'Qual comando você usa para ver os containers em execução?'
                    },
                    {
                        title: 'Imagens e Containers',
                        content: 'Imagens são templates para criar containers. Containers são instâncias em execução de uma imagem.',
                        examples: ['docker pull nginx', 'docker run -d nginx', 'docker stop container_id'],
                        practice: 'Qual a diferença entre uma imagem e um container?'
                    },
                    {
                        title: 'Dockerfile Básico',
                        content: 'Dockerfile é um arquivo de texto com instruções para construir uma imagem Docker.',
                        examples: ['FROM node:18', 'WORKDIR /app', 'COPY package.json .', 'RUN npm install', 'CMD ["node", "app.js"]'],
                        practice: 'Qual instrução do Dockerfile define o comando que será executado quando o container iniciar?'
                    }
                ],
                intermediario: [
                    {
                        title: 'Docker Compose',
                        content: 'Docker Compose é uma ferramenta para definir e executar aplicações multi-container.',
                        examples: ['docker-compose.yml', 'services:', '  web:', '    build: .', '    ports: - "3000:3000"'],
                        practice: 'Qual o comando para iniciar todos os serviços definidos no docker-compose.yml?'
                    },
                    {
                        title: 'Volumes e Redes',
                        content: 'Volumes persistem dados. Redes permitem comunicação entre containers.',
                        examples: ['docker volume create meu-volume', 'docker network create minha-rede', 'docker run -v meu-volume:/data'],
                        practice: 'Qual a diferença entre um volume e um bind mount?'
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

module.exports = DockerTeacher;
