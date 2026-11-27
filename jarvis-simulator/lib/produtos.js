const axios = require('axios');

const JARVIS_URL = process.env.JARVIS_INTERNAL_URL || 'http://api:3000/internal';
const INTERNAL_TOKEN = process.env.INTERNAL_SIM_TOKEN;

const jarvisApi = axios.create({
    baseURL: JARVIS_URL,
    timeout: 15000,
    headers: { 'x-internal-token': INTERNAL_TOKEN },
});

const cache = new Map();
const TTL_MS = 60000;

async function getProdutos(companyId) {
    companyId = Number(companyId);

    if (!companyId) throw new Error('companyId obrigatório');

    const cached = cache.get(companyId);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
        return cached.produtos;
    }

    try {
        const { data } = await jarvisApi.get('/produtos', {
            params: { companyId },
        });

        const produtos = Array.isArray(data) ? data : [];

        cache.set(companyId, {
            produtos,
            fetchedAt: Date.now(),
        });

        return produtos;
    } catch (err) {
        if (cached) return cached.produtos;
        throw new Error(`Erro ao buscar produtos da empresa ${companyId}: ${err.message}`);
    }
}

async function pickRandomProduto(companyId) {
    const produtos = await getProdutos(companyId);

    if (!produtos.length) {
        throw new Error(`Empresa ${companyId} não possui produtos cadastrados`);
    }

    return produtos[Math.floor(Math.random() * produtos.length)];
}

module.exports = { getProdutos, pickRandomProduto };
