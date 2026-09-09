const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const cache = require('./cacheService');

// Carregar bot config
const botConfig = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../bot_volumetrao.json'),
        'utf8'
    )
);

// Inicializar clientes
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Função principal com cache
async function generateResponse(userInput, history = []) {
    const cacheKey = `ia_${userInput}`;

    // Verificar cache
    const cached = cache.get(cacheKey);

    if (cached) {
        logger.info('📦 Resposta do cache para:', userInput);
        return cached;
    }

    try {
        // Tentar Groq primeiro
        logger.info('🤖 Tentando Groq...');

        const response = await generateWithGroq(userInput, history);

        cache.set(cacheKey, response, 300);

        logger.info('✅ Resposta gerada pelo Groq');

        return response;

    } catch (error) {
        logger.warn('⚠️ Groq falhou, usando Gemini:', error.message);

        try {
            const response = await generateWithGemini(userInput, history);

            cache.set(cacheKey, response, 300);

            logger.info('✅ Resposta gerada pelo Gemini');

            return response;

        } catch (err) {
            logger.error('❌ Ambas IAs falharam:', err.message);

            return botConfig.fallbackMessage ||
                'Desculpe, estou com problemas técnicos. Tente novamente mais tarde.';
        }
    }
}

async function generateWithGroq(userInput, history) {
    const messages = [
        {
            role: 'system',
            content: botConfig.systemPrompt
        },
        ...history.map(h => ({
            role: h.role,
            content: h.content
        })),
        {
            role: 'user',
            content: userInput
        }
    ];

    const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 200,
        temperature: 0.85
    });

    return response.choices[0].message.content;
}

async function generateWithGemini(userInput, history) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp'
    });

    const chat = model.startChat({
        history: history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [
                {
                    text: h.content
                }
            ]
        }))
    });

    const result = await chat.sendMessage(`Usuário: ${userInput}`);

    return result.response.text();
}

module.exports = {
    generateResponse
};
