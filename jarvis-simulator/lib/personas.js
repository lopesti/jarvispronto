const aiPool = require('./aiPool');

// Pool padrão de personas. Cada uma vira o "system prompt" do cliente simulado.
// Escritas pra estressar pontos específicos do funil de vendas, não só bater papo.
const PERSONA_POOL = [
    {
        id: 'indeciso',
        label: 'Indeciso',
        prompt:
            'Você é um cliente em potencial no WhatsApp, indeciso, que gosta do produto mas hesita bastante antes de decidir. Faz perguntas, muda de ideia, pede pra pensar mais.',
    },
    {
        id: 'cetico_preco',
        label: 'Cético com o preço',
        prompt:
            'Você é um cliente no WhatsApp desconfiado do preço. Compara com concorrentes, pergunta se tem desconto, questiona se vale o valor cobrado.',
    },
    {
        id: 'apressado',
        label: 'Apressado',
        prompt:
            'Você é um cliente no WhatsApp com pressa, quer resolver rápido, manda mensagens curtas, se impacienta se a resposta demorar ou enrolar.',
    },
    {
        id: 'ja_comprou_similar',
        label: 'Já comprou produto parecido',
        prompt:
            'Você é um cliente no WhatsApp que já comprou um produto parecido antes e não gostou muito. Está cético mas curioso se esse é diferente.',
    },
    {
        id: 'fora_de_contexto',
        label: 'Foge do assunto',
        prompt:
            'Você é um cliente no WhatsApp que se distrai fácil, muda de assunto, faz perguntas aleatórias não relacionadas ao produto de vez em quando, mas eventualmente volta ao tema.',
    },
    {
        id: 'decidido',
        label: 'Decidido a comprar',
        prompt:
            'Você é um cliente no WhatsApp já decidido a comprar, só quer saber como fechar rápido: forma de pagamento, prazo de entrega, como confirmar o pedido.',
    },
];

function getPersonaPool() {
    return PERSONA_POOL;
}

function pickPersonas(ids) {
    if (!ids || !ids.length) return PERSONA_POOL;
    return PERSONA_POOL.filter((p) => ids.includes(p.id));
}

/**
 * Gera a próxima fala do "cliente simulado", reagindo à última resposta do Jarvis.
 * history: [{ role: 'user'|'assistant', content }]
 */
async function generateCustomerReply(persona, history, produto) {
    const produtoContext = produto
        ? ` Você está interessado especificamente no produto "${produto.nome}"` +
          (produto.preco ? `, que você viu custando R$ ${Number(produto.preco).toFixed(2)}` : '') +
          '. Mencione esse produto pelo nome nas suas perguntas.'
        : '';

    const messages = [
        {
            role: 'system',
            content:
                `${persona.prompt}${produtoContext} Responda SEMPRE como esse cliente responderia no WhatsApp: ` +
                'frases curtas, informais, no máximo 2 frases, sem explicar que você é uma simulação. ' +
                'Nunca saia do personagem. Se a conversa já resolveu o que você queria, pode encerrar ' +
                'com uma despedida curta.',
        },
        ...history.map((h) => ({
            role: h.role === 'assistant' ? 'user' : 'assistant',
            content: h.content,
        })),
    ];

    if (history.length === 0) {
        messages.push({
            role: 'user',
            content: 'Inicie a conversa como esse cliente entrando em contato pela primeira vez.',
        });
    }

    const text = await aiPool.generate(messages);
    return text || 'Oi!';
}

module.exports = { getPersonaPool, pickPersonas, generateCustomerReply };
