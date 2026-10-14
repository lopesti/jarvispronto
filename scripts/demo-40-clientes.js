const messageController = require('../engine/controllers/messageController');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://host.docker.internal:11434/api/generate';
const COMPANY_ID = 1;

const BATCH_SIZE = 5;
const PAUSE_BETWEEN_BATCHES = 15000;
const PERGUNTAS_POR_CLIENTE = 2;

// ─── PROMPTS REFORÇADOS ─────────────────────────
const PERFIS = [
  { nome: 'DESCONFIADO', cor: '\x1b[33m',
    system: 'Voce e um CLIENTE REAL conversando por WhatsApp com uma loja. NUNCA de instrucoes. Apenas ESCREVA a mensagem que voce mandaria. Exemplos de mensagens suas: "oi, isso e golpe?", "tem garantia mesmo?", "e confiavel?". Escreva UMA mensagem curta agora.' },
  { nome: 'APRESSADO', cor: '\x1b[31m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem que voce mandaria. Exemplos: "quanto custa?", "aceita pix?", "quero comprar agora". Escreva UMA mensagem curta agora.' },
  { nome: 'INDECISO', cor: '\x1b[35m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "qual voce recomenda?", "vale a pena o kit 2?", "ta dificil decidir". Escreva UMA mensagem curta agora.' },
  { nome: 'REVOLTADO', cor: '\x1b[91m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "comprei e nao chegou nada!", "quero meu dinheiro de volta". Escreva UMA mensagem curta agora.' },
  { nome: 'CURIOSO', cor: '\x1b[36m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "quais as cores?", "e bom mesmo?", "quanto tempo dura?". Escreva UMA mensagem curta agora.' },
  { nome: 'COMPARADOR', cor: '\x1b[94m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "qual a diferenca entre kit 1 e kit 2?", "por que o kit 3 e mais caro?". Escreva UMA mensagem curta agora.' },
  { nome: 'ECONOMICO', cor: '\x1b[32m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "tem desconto?", "qual o mais barato?", "aceita parcelar?". Escreva UMA mensagem curta agora.' },
  { nome: 'VIP', cor: '\x1b[95m',
    system: 'Voce e um CLIENTE REAL. NUNCA de instrucoes. Apenas ESCREVA a mensagem. Exemplos: "tem atendimento premium?", "quero entrega expressa". Escreva UMA mensagem curta agora.' },
];

const CLIENTES = [];
for (let i = 0; i < 40; i++) {
  const perfil = PERFIS[i % PERFIS.length];
  CLIENTES.push({
    id: i + 1,
    perfil: perfil.nome,
    system: perfil.system,
    cor: perfil.cor,
    phone: `551190000${String(i + 1).padStart(4, '0')}@s.whatsapp.net`,
  });
}

const RESET = '\x1b[0m', CYAN = '\x1b[36m', GREEN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RED = '\x1b[31m';
const stats = { ok: 0, falhas: 0, jarvis: 0, clientes: 0 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function perguntarOllama(system, historico, tentativa = 1) {
  const context = historico.length
    ? historico.map((h) => h.role + ': ' + h.content).join('\n')
    : '(primeira mensagem)';
  const prompt = system + '\n\nConversa ate agora:\n' + context + '\n\nSua proxima mensagem (APENAS a mensagem do cliente, sem prefixo, sem explicacao):';

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5:2b',
        prompt,
        stream: false,
        think: false,
        options: { num_ctx: 1024, num_predict: 50, temperature: 1.0 },
      }),
    });
    const data = await res.json();
    let text = (data.response || '').trim();
    text = text.replace(/Thinking[\s\S]*?(?=\n\n|$)/i, '').trim();
    text = text.replace(/^Cliente:\s*/i, '').trim();
    text = text.replace(/^["']|["']$/g, '').trim();
    text = text.replace(/^[\d\.\)\-\s\*]+/, '').trim();
    if (text.length > 200) text = text.slice(0, 200);
    return text || null;
  } catch (e) {
    if (tentativa < 3) { await sleep(2000 * tentativa); return perguntarOllama(system, historico, tentativa + 1); }
    return null;
  }
}

async function rodaCliente(c) {
  const historico = [];
  const fakeSock = {
    sendMessage: async (to, msg) => {
      stats.jarvis++;
      const lines = String(msg.text).split('\n');
      console.log(GREEN + '    JARVIS:' + RESET + ' ' + lines[0].slice(0, 100));
    },
  };
  let clienteOk = false;
  for (let i = 0; i < PERGUNTAS_POR_CLIENTE; i++) {
    const pergunta = await perguntarOllama(c.system, historico);
    if (!pergunta) break;
    console.log(c.cor + `    [${c.perfil}] ${pergunta}` + RESET);
    historico.push({ role: 'Cliente', content: pergunta });
    try {
      await messageController.handleMessage(c.phone, pergunta, fakeSock, { companyId: COMPANY_ID, rid: `demo-${c.id}-${i}` });
      clienteOk = true;
    } catch (e) {
      console.log(RED + '    [jarvis erro] ' + e.message.slice(0, 80) + RESET);
    }
    await sleep(300);
  }
  if (clienteOk) stats.ok++; else stats.falhas++;
  stats.clientes++;
}

(async () => {
  console.log('\n' + CYAN + '═══════════════════════════════════════════════════════' + RESET);
  console.log(CYAN + '  DEMO: 40 Clientes LOCAIS (Ollama) x Jarvis (Groq)' + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════════════' + RESET);

  const inicio = Date.now();
  const totalLotes = Math.ceil(CLIENTES.length / BATCH_SIZE);

  for (let i = 0; i < CLIENTES.length; i += BATCH_SIZE) {
    const lote = CLIENTES.slice(i, i + BATCH_SIZE);
    const numLote = Math.floor(i / BATCH_SIZE) + 1;
    console.log('\n' + CYAN + `═══ Lote ${numLote}/${totalLotes} ═══` + RESET);
    for (const c of lote) {
      console.log('\n' + DIM + `  Cliente #${c.id}/40 [${c.perfil}]` + RESET);
      await rodaCliente(c);
    }
    if (i + BATCH_SIZE < CLIENTES.length) {
      console.log('\n' + YEL + `  ⏸️  Pausa 15s...` + RESET);
      await sleep(PAUSE_BETWEEN_BATCHES);
    }
  }

  const tempo = Math.round((Date.now() - inicio) / 1000);
  console.log('\n' + CYAN + '═══════════════════════════════════════════════════════' + RESET);
  console.log(GREEN + `  ✅ ${stats.clientes}/40 clientes | ${stats.jarvis} respostas | ${tempo}s` + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════════════\n' + RESET);
  process.exit(0);
})();
