const Groq = require('groq-sdk');
const messageController = require('../engine/controllers/messageController');

const CLIENT_KEY = process.env.GROQ_API_KEY_CLIENT || process.env.GROQ_API_KEY;
const groqClient = new Groq({ apiKey: CLIENT_KEY });
const COMPANY_ID = 1;
const MODEL = 'openai/gpt-oss-20b';

const ROTEIROS = [
  { perfil: 'DESCONFIADO', cor: '\x1b[33m', sys: 'Voce e um cliente DESCONFIADO. Manda UMA mensagem curta. Ex: "oi, isso e golpe?", "tem garantia?"', fb: ['oi, isso e golpe?', 'tem garantia mesmo?'] },
  { perfil: 'APRESSADO', cor: '\x1b[31m', sys: 'Voce e um cliente APRESSADO. UMA mensagem curta. Ex: "quanto custa?", "aceita pix?"', fb: ['quanto custa?', 'aceita pix?'] },
  { perfil: 'INDECISO', cor: '\x1b[35m', sys: 'Voce e um cliente INDECISO. UMA mensagem curta. Ex: "qual recomenda?", "vale a pena?"', fb: ['qual voce recomenda?', 'vale a pena o kit 2?'] },
  { perfil: 'REVOLTADO', cor: '\x1b[91m', sys: 'Voce e um cliente REVOLTADO. UMA mensagem curta. Ex: "comprei e nao chegou", "quero reembolso"', fb: ['comprei e nao chegou nada!', 'quero resolver isso'] },
  { perfil: 'CURIOSO', cor: '\x1b[36m', sys: 'Voce e um cliente CURIOSO. UMA mensagem curta. Ex: "quais as cores?", "quanto dura?"', fb: ['quais as cores disponiveis?', 'quanto tempo dura a bateria?'] },
  { perfil: 'COMPARADOR', cor: '\x1b[94m', sys: 'Voce compara kits. UMA mensagem curta. Ex: "diferenca kit 1 e 2?"', fb: ['qual a diferenca entre kit 1 e 2?', 'por que o kit 3 e mais caro?'] },
  { perfil: 'ECONOMICO', cor: '\x1b[32m', sys: 'Voce busca o mais barato. UMA mensagem curta. Ex: "tem desconto?", "qual o mais barato?"', fb: ['tem desconto?', 'qual o mais barato?'] },
  { perfil: 'VIP', cor: '\x1b[95m', sys: 'Voce e cliente VIP. UMA mensagem curta. Ex: "tem atendimento premium?"', fb: ['tem atendimento premium?', 'quero entrega expressa'] },
];

const RESET = '\x1b[0m', CYAN = '\x1b[36m', GREEN = '\x1b[32m', DIM = '\x1b[2m', RED = '\x1b[31m';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { clientes: 0, respostas: 0, ollamaOk: 0, fixaUsado: 0 };

async function gerarPergunta(rot, historico, idx) {
  try {
    const res = await groqClient.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: rot.sys + ' Responda APENAS com UMA mensagem curta de WhatsApp. Nada mais.' },
        ...historico,
        { role: 'user', content: 'Proxima mensagem:' },
      ],
      max_tokens: 60,
      temperature: 0.9,
    });
    let text = (res.choices[0].message.content || '').trim();
    text = text.replace(/^["']|["']$/g, '').split('\n')[0].trim();
    text = text.replace(/^(message|mensagem|cliente|user):\s*/i, '').trim();
    if (text.length > 120) text = text.slice(0, 120);
    if (text.length >= 5) return { texto: text, fonte: 'groq' };
  } catch (e) {}
  // Fallback fixo
  const fb = rot.fb[idx % rot.fb.length];
  return { texto: fb, fonte: 'fixa' };
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
    const { texto, fonte } = await gerarPergunta(rot, historico, i);
    const tag = fonte === 'groq' ? CYAN + '[GROQ]' + RESET : DIM + '[FIXA]' + RESET;
    if (fonte === 'groq') stats.ollamaOk++; else stats.fixaUsado++;
    console.log('\n' + rot.cor + `    [${rot.perfil}]` + RESET + ' ' + tag + ' ' + texto);
    historico.push({ role: 'user', content: texto });
    try {
      await messageController.handleMessage(phone, texto, fakeSock, { companyId: COMPANY_ID, rid: `demo-${idx}-${i}` });
    } catch (e) { console.log(RED + '    erro: ' + e.message.slice(0, 60) + RESET); }
    await sleep(300);
  }
  stats.clientes++;
}

(async () => {
  console.log('\n' + CYAN + '═══ 40 clientes IA (Groq + fallback) x Jarvis ═══' + RESET);
  console.log('🔑 Chave cliente: ' + CLIENT_KEY?.slice(0, 15) + '...' + RESET);
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
  console.log('\n' + CYAN + '═══════════════════════════════════════' + RESET);
  console.log(GREEN + `  ✅ ${stats.clientes} clientes | ${stats.respostas} respostas | ${t}s` + RESET);
  console.log(CYAN + `  🤖 Groq gerou: ${stats.ollamaOk}  |  📋 Fallback: ${stats.fixaUsado}` + RESET);
  console.log(CYAN + '═══════════════════════════════════════\n' + RESET);
  process.exit(0);
})();
