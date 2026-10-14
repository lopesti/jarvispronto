// scripts/demo-ia-vs-ia-surpreendente.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Groq = require('groq-sdk');
const messageController = require('../engine/controllers/messageController');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const COMPANY_ID = 1; // Empresa com catálogo de escova

const CLIENTES = [
  {
    phone: '5511900000001@s.whatsapp.net',
    perfil: 'DESCONFIADO',
    prompt: 'Você é um cliente DESCONFIADO. Desconfia de tudo, pergunta se é golpe, se tem garantia, se o produto é bom mesmo. Fale curto e direto.',
    cor: '\x1b[33m', // amarelo
  },
  {
    phone: '5511900000002@s.whatsapp.net',
    perfil: 'APRESSADO',
    prompt: 'Você é um cliente APRESSADO. Quer fechar rápido, odeia enrolação, pergunta preço e forma de pagamento logo. Frases curtas.',
    cor: '\x1b[31m', // vermelho
  },
  {
    phone: '5511900000003@s.whatsapp.net',
    perfil: 'INDECISO',
    prompt: 'Você é um cliente INDECISO. Pergunta várias coisas, compara kits, pergunta "vale a pena?", "qual é melhor?". Fala mais longo.',
    cor: '\x1b[35m', // magenta
  },
];

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';

async function generateCustomerMessage(perfil, prompt, history) {
  const res = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: prompt + ' Responda em português brasileiro, curto (1-2 frases).' },
      ...history,
    ],
    max_tokens: 60,
    temperature: 0.9,
  });
  return res.choices[0].message.content.trim();
}

async function runCliente(cliente) {
  const history = [];
  const fakeSock = {
    sendMessage: async (to, msg) => {
      console.log(`${GREEN}  🤖 JARVIS → [${cliente.perfil}]:${RESET} ${msg.text}`);
    },
  };

  for (let i = 0; i < 4; i++) {
    const msg = await generateCustomerMessage(cliente.perfil, cliente.prompt, history);
    console.log(`${cliente.cor}👤 [${cliente.perfil}]:${RESET} ${msg}`);
    await messageController.handleMessage(cliente.phone, msg, fakeSock, {
      companyId: COMPANY_ID,
      rid: `demo-${cliente.perfil}-${i}`,
    });
    history.push({ role: 'user', content: msg });
    await new Promise((r) => setTimeout(r, 800));
  }
}

(async () => {
  console.log(`\n${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}   🎬  DEMO: 3 clientes IA simultâneos × Jarvis${RESET}`);
  console.log(`${CYAN}   👤 DESCONFIADO  |  👤 APRESSADO  |  👤 INDECISO${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);

  await Promise.all(CLIENTES.map(runCliente));

  console.log(`\n${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}   ✅  3 conversas concluídas em paralelo${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);
  process.exit(0);
})();