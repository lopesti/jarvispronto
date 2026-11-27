const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Lê uma lista de chaves de uma env var. Aceita tanto uma variável no plural
 * com várias chaves separadas por vírgula (GROQ_API_KEYS=k1,k2,k3) quanto a
 * variável singular de sempre (GROQ_API_KEY=k1), pra não quebrar quem só tem uma.
 */
function readKeys(pluralVar, singularVar) {
    const plural = (process.env[pluralVar] || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
    if (plural.length) return plural;

    const single = (process.env[singularVar] || '').trim();
    return single ? [single] : [];
}

const clients = [];

readKeys('GROQ_API_KEYS', 'GROQ_API_KEY').forEach((key, i) => {
    const groq = new Groq({ apiKey: key });
    clients.push({
        id: `groq-${i}`,
        generate: async (messages) => {
            const completion = await groq.chat.completions.create({
                model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.9,
                max_tokens: 120,
            });
            return completion.choices[0]?.message?.content?.trim();
        },
    });
});

readKeys('GEMINI_API_KEYS', 'GEMINI_API_KEY').forEach((key, i) => {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    clients.push({
        id: `gemini-${i}`,
        generate: async (messages) => {
            const systemMsg = messages.find((m) => m.role === 'system');
            const rest = messages.filter((m) => m.role !== 'system');
            const lastMsg = rest[rest.length - 1];
            const chat = model.startChat({
                history: rest.slice(0, -1).map((m) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                })),
                systemInstruction: systemMsg ? systemMsg.content : undefined,
            });
            const result = await chat.sendMessage(lastMsg.content);
            return result.response.text().trim();
        },
    });
});

let cursor = 0;
function nextClient(skipId) {
    const pool = skipId ? clients.filter((c) => c.id !== skipId) : clients;
    if (!pool.length) return null;
    const client = pool[cursor % pool.length];
    cursor += 1;
    return client;
}

/**
 * Gera uma resposta usando o próximo cliente da fila (round-robin entre todas
 * as chaves/provedores configurados). Se der erro (ex: rate limit), tenta uma
 * vez com outro cliente do pool antes de desistir.
 */
async function generate(messages) {
    if (!clients.length) {
        throw new Error(
            'Nenhuma chave de IA configurada. Defina GROQ_API_KEY(S) e/ou GEMINI_API_KEY(S) no .env do simulador.'
        );
    }

    const first = nextClient();
    try {
        return await first.generate(messages);
    } catch (err) {
        const fallback = nextClient(first.id);
        if (!fallback) throw err;
        return await fallback.generate(messages);
    }
}

function poolSize() {
    return clients.length;
}

module.exports = { generate, poolSize };
