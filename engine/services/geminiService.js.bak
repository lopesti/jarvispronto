const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const cache = require('./cacheService');

const botConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../bot_volumetrao.json'), 'utf8')
);

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

function buildCacheKey(userInput, history) {
  const histHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(history || []))
    .digest('hex')
    .slice(0, 16);
  const inputHash = crypto
    .createHash('sha256')
    .update(String(userInput || ''))
    .digest('hex')
    .slice(0, 16);
  return `ia_${inputHash}_${histHash}`;
}

async function generateResponse(userInput, history = []) {
  const cacheKey = buildCacheKey(userInput, history);

  const cached = await cache.get(cacheKey);
  if (cached) {
    logger.info('[gemini] Resposta do cache: ' + String(userInput).slice(0, 40));
    return cached;
  }

  try {
    if (groq) {
      logger.info('[gemini] Tentando Groq...');
      const response = await generateWithGroq(userInput, history);
      await cache.set(cacheKey, response, 300);
      logger.info('[gemini] Resposta gerada pelo Groq');
      return response;
    }
    throw new Error('Groq nao configurado');
  } catch (error) {
    logger.warn('[gemini] Groq falhou, usando Gemini: ' + error.message);
    try {
      if (!genAI) throw new Error('Gemini nao configurado');
      const response = await generateWithGemini(userInput, history);
      await cache.set(cacheKey, response, 300);
      logger.info('[gemini] Resposta gerada pelo Gemini');
      return response;
    } catch (err) {
      logger.error('[gemini] Ambas IAs falharam: ' + err.message);
      return (
        botConfig.fallbackMessage ||
        'Desculpe, estou com problemas tecnicos. Tente novamente mais tarde.'
      );
    }
  }
}

async function generateWithGroq(userInput, history) {
  const messages = [
    { role: 'system', content: botConfig.systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userInput },
  ];

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 200,
    temperature: 0.85,
  });

  return response.choices[0].message.content;
}

async function generateWithGemini(userInput, history) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
  });

  const result = await chat.sendMessage('Usuario: ' + userInput);
  return result.response.text();
}

module.exports = { generateResponse, buildCacheKey };
