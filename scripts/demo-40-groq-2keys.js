const Groq = require('groq-sdk');
const messageController = require('../engine/controllers/messageController');

// ─── Chave EXCLUSIVA do cliente IA (não compete com o Jarvis) ───
const CLIENT_KEY = process.env.GROQ_API_KEY_CLIENT || process.env.GROQ_API_KEY;
const groqClient = new Groq({ apiKey: CLIENT_KEY });

const COMPANY_ID = 1;
const MODEL = 'openai/gpt-oss-20b';

const ROTEIROS = [
  { perfil: 'DESCONFIADO', cor: '\x1b[33m', sys: 'Voce e um cliente DESCONFIADO. Manda UMA mensagem curta. Ex: "oi, isso e golpe?", "tem garantia?"' },
  { perfil: 'APRESSADO', cor: '\x1b[31m', sys: 'Voce e um cliente APRESSADO. UMA mensagem curta. Ex: "quanto custa?", "aceita pix?"' },
  { perfil: 'INDECISO', cor: '\x1b[35m', sys: 'Voce e um cliente INDECISO. UMA mensagem curta. Ex: "qual recomenda?", "vale a pena?"' },
  { perfil: 'REVOLTADO', cor: '\x1b[91m', sys: 'Voce e um cliente REVOLTADO. UMA mensagem curta. Ex: "comprei e nao chegou", "quero reembolso"' },
  { perfil: 'CURIOSO', cor: '\x1b[36m', sys: 'Voce e um cliente CURIOSO. UMA mensagem curta. Ex: "quais as cores?", "quanto dura?"' },
  { perfil: 'COMPARADOR', cor: '\x1b[94m', sys: 'Voce compara kits. UMA mensagem curta. Ex: "diferenca kit 1 e 2?"' },
  { perfil: 'ECONOMICO', cor: '\x1b[32m', sys: 'Voce busca o mais barato. UMA mensagem curta. Ex: "tem desconto?", "qual o mais barato?"' },
  { perfil: 'VIP', cor: '\x1b[95m', sys: 'Voce e cliente VIP. UMA mensagem curta. Ex: "tem atendimento premium?"' },
];

const RESET = '\x1b[0m', CYAN = '\x1b[36m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RED = '\x1b[31m';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { clientes: 0, respostas: 0 };

console.log('\n' + CYAN + '🔑 Chave do cliente: ' + (CLIENT_KEY?.slice(0, 15) || 'VAZIO') + '...' + RESET);
console.log(DIM + '   (o Jarvis usa a chave principal, sem competir)' + RESET);

async function gerarPergunta(rot, historico, tentativa = 1) {
  try {
    const res = await groqClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: rot.sys + ' NUNCA explique. NUNCA diga que e IA. Responda APENAS com a mensagem do cliente.' },
        ...historico,
        { role: 'user', content: 'Escreva sua proxima mensagem (apenas o texto):' },
      ],
      max_tokens: 60,
      temperature: 0.9,
    });
    let text = (res.choices[0].message.content || '').trim();
    text = text.replace(/^["']|["']$/g, '').split('\n')[0].trim();
    if (text.length > 120) text = text.slice(0, 120);
    if (text.length < 4) throw new Error('curta');
    return text;
  } catch (e) {
    if (tentativa < 3) {
      console.log(DIM + '    [retry ' + tentativa + '] ' + e.message.slice(0, 50) + RESET);
      await sleep(3000 * tentativa);
      return gerarPergunta(rot, historico, tentativa + 1);
    }
    console.error(DIM + '    [erro final] ' + e.message.slice(0, 80) + RESET);
    return null;
  }
}

async function rodaCliente(rot, idx) {
  const phone = `551190000${String(idx + 1).padStart(4, '0')}@s.whatsapp.net`;
  const historico = [];
  const fakeSock = {
    sendMessage: async (to, msg) => {
      stats.respostas++;
      const l = String(msg.text).split('\n')[0].slice(0, 100);
      console.log(GREEN + '    JARVIS:' + RESET + ' ' + l);
      historico.push({ role: 'assistant', content: msg.text });
    },
  };
  for (let i = 0; i < 2; i++) {
    const pergunta = await gerarPergunta(rot, historico);
    if (!pergunta) break;
    console.log('\n' + rot.cor + `    [${rot.perfil}] ${pergunta}` + RESET);
    historico.push({ role: 'user', content: pergunta });
    try {
      await messageController.handleMessage(phone, pergunta, fakeSock, { companyId: COMPANY_ID, rid: `demo-${idx}-${i}` });
    } catch (e) { console.log(RED + '    erro: ' + e.message.slice(0, 60) + RESET); }
    await sleep(400);
  }
  stats.clientes++;
}

(async () => {
  console.log('\n' + CYAN + '═══ DEMO: 40 clientes IA (2 chaves Groq) x Jarvis ═══' + RESET);
  const inicio = Date.now();
  for (let i = 0; i < 40; i++) {
    const rot = ROTEIROS[i % ROTEIROS.length];
    console.log('\n' + DIM + `  Cliente #${i + 1}/40 [${rot.perfil}]` + RESET);
    await rodaCliente(rot, i);
    if ((i + 1) % 5 === 0 && i < 39) {
      console.log('\n' + DIM + '  ⏸️  5s...' + RESET);
      await sleep(5000);
    }
  }
  const t = Math.round((Date.now() - inicio) / 1000);
  console.log('\n' + CYAN + '═══════════════════════════════════════════════' + RESET);
  console.log(GREEN + `  ✅ ${stats.clientes} clientes | ${stats.respostas} respostas | ${t}s` + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════\n' + RESET);
  process.exit(0);
})();
