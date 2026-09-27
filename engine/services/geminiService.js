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

// ═══════════════════════════════════════════════════════════
//  Cache key com tenant (BUG-008 corrigido)
//  Sem histórico na chave: input igual → cache hit
// ═══════════════════════════════════════════════════════════

function normalizeInput(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.,;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chave de cache isolada por tenant.
 * NÃO inclui histórico — se a pergunta é a mesma, resposta é a mesma.
 */
function buildCacheKey(userInput, companyId) {
  const cid = Number(companyId) || 0;
  const inputHash = crypto
    .createHash('sha256')
    .update(normalizeInput(userInput))
    .digest('hex')
    .slice(0, 16);

  return `ia:${cid}:${inputHash}`;
}

// ═══════════════════════════════════════════════════════════
//  Geração com cache isolado por tenant
// ═══════════════════════════════════════════════════════════

async function generateResponse(userInput, history = [], companyId) {
  const cid = Number(companyId);
  if (!cid || Number.isNaN(cid)) {
    logger.warn('[gemini] companyId ausente — gerando sem cache');
    return await generateWithoutCache(userInput, history);
  }

  const cacheKey = buildCacheKey(userInput, cid);

  // 1. Cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    logger.info(
      `[gemini] Cache HIT company=${cid} input="${String(userInput).slice(0, 40)}"`
    );
    return cached;
  }

  // 2. Groq
  try {
    if (groq) {
      logger.info(`[gemini] Groq company=${cid}...`);
      const response = await generateWithGroq(userInput, history);
      await cache.set(cacheKey, response, 3600); // 1 hora
      logger.info(`[gemini] Resposta gerada pelo Groq company=${cid}`);
      return response;
    }
    throw new Error('Groq nao configurado');
  } catch (error) {
    logger.warn(`[gemini] Groq falhou (${error.message}), usando Gemini...`);
  }

  // 3. Gemini
  try {
    if (!genAI) throw new Error('Gemini nao configurado');
    const response = await generateWithGemini(userInput, history);
    await cache.set(cacheKey, response, 3600);
    logger.info(`[gemini] Resposta gerada pelo Gemini company=${cid}`);
    return response;
  } catch (err) {
    logger.error(`[gemini] Ambas IAs falharam: ${err.message}`);

    const fallback =
      botConfig.fallbackMessage ||
      'Desculpe, estou com problemas tecnicos. Tente novamente mais tarde.';

    // Cacheia fallback por 60s (evita martelar a IA quando ela esta fora)
    await cache.set(cacheKey, fallback, 60);
    logger.info(`[gemini] Fallback cacheado company=${cid} TTL=60s`);

    return fallback;
  }
}

/**
 * Fallback sem cache (quando companyId nao e informado).
 */
async function generateWithoutCache(userInput, history) {
  try {
    if (groq) return await generateWithGroq(userInput, history);
    throw new Error('Groq nao configurado');
  } catch (error) {
    logger.warn('[gemini] Groq falhou: ' + error.message);
  }
  try {
    if (!genAI) throw new Error('Gemini nao configurado');
    return await generateWithGemini(userInput, history);
  } catch (err) {
    logger.error('[gemini] Ambas IAs falharam: ' + err.message);
    return (
      botConfig.fallbackMessage ||
      'Desculpe, estou com problemas tecnicos. Tente novamente mais tarde.'
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  Providers
// ═══════════════════════════════════════════════════════════

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

module.exports = { generateResponse, buildCacheKey, normalizeInput };