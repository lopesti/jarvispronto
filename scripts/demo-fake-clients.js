/**
 * JARVIS — Demo TCC: clientes fake com nome no painel (~2 min)
 *
 * Coloque em: scripts/demo-fake-clients.js
 *
 * Uso:
 *   docker compose cp scripts/demo-fake-clients.js api:/app/scripts/demo-fake-clients.js
 *   docker compose exec api node /app/scripts/demo-fake-clients.js
 *
 * Opcional:
 *   COMPANY_ID=1 DEMO_SPEED=1 node /app/scripts/demo-fake-clients.js
 *   DEMO_SPEED=2  → mais rápido (teste)
 *   DEMO_SPEED=0.8 → mais lento
 */

const path = require('path');

function loadEngine() {
  const candidates = [
    path.join(__dirname, '..', 'engine'),
    path.join(__dirname, 'engine'),
    '/app/engine',
  ];
  for (const root of candidates) {
    try {
      return {
        handleMessage: require(path.join(root, 'controllers/messageController')).handleMessage,
        conversationRepo: require(path.join(root, 'repositories/conversationRepository')),
      };
    } catch (_) {
      /* tenta próximo */
    }
  }
  console.error('Não encontrou engine/. Rode dentro do container api.');
  process.exit(1);
}

const { handleMessage, conversationRepo } = loadEngine();

const COMPANY_ID = Number(process.env.COMPANY_ID || 1);
const SPEED = Number(process.env.DEMO_SPEED || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));

const fakeSock = {
  sendMessage: async (_to, msg) => {
    const text = typeof msg === 'string' ? msg : msg?.text || '';
    console.log(`   🤖 JARVIS: ${String(text).replace(/\s+/g, ' ').slice(0, 160)}`);
  },
};

const CLIENTES = [
  {
    nome: 'Maria Silva',
    phone: '5511999100001@s.whatsapp.net',
    msgs: [
      'Oi, boa noite! Ainda tem a escova alisadora?',
      'Qual o valor dela?',
      'Aceita Pix?',
    ],
  },
  {
    nome: 'Carlos Mendes',
    phone: '5511999100002@s.whatsapp.net',
    msgs: [
      'Essa escova é original?',
      'Quanto tempo demora pra entregar em SP?',
      'Quero falar com um atendente',
    ],
  },
  {
    nome: 'Ana Oliveira',
    phone: '5511999100003@s.whatsapp.net',
    msgs: [
      'Quero o kit 1, tem pronto?',
      'Dá pra pagar no cartão?',
    ],
  },
  {
    nome: 'João Pedro',
    phone: '5511999100004@s.whatsapp.net',
    msgs: [
      'Vocês abrem sábado?',
      'Tem desconto à vista?',
    ],
  },
  {
    nome: 'Fernanda Costa',
    phone: '5511999100005@s.whatsapp.net',
    msgs: [
      'Vi o anúncio da escova 3 em 1',
      'Ela queima o cabelo?',
      'Manda o link de pagamento',
    ],
  },
  {
    nome: 'Rafael Souza',
    phone: '5511999100006@s.whatsapp.net',
    msgs: [
      'Boa tarde, tem frete grátis?',
      'Fechou, quero 1 unidade',
    ],
  },
];

function buildTimeline() {
  const queue = [];
  const maxRounds = Math.max(...CLIENTES.map((c) => c.msgs.length));
  for (let round = 0; round < maxRounds; round++) {
    for (const c of CLIENTES) {
      if (c.msgs[round]) {
        queue.push({
          nome: c.nome,
          phone: c.phone,
          text: c.msgs[round],
          delayAfter: 7500 + Math.floor(Math.random() * 1500),
        });
      }
    }
  }
  return queue;
}

async function setName(phone, nome) {
  try {
    if (conversationRepo.setDisplayName) {
      await conversationRepo.setDisplayName(phone, COMPANY_ID, nome);
    }
  } catch (_) {
    /* conversa pode ainda não existir */
  }
}

async function run() {
  const timeline = buildTimeline();

  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  JARVIS · Demo TCC · nomes no painel');
  console.log(`  ${CLIENTES.length} clientes · ${timeline.length} msgs · ~2 min`);
  console.log('══════════════════════════════════════════');
  CLIENTES.forEach((c) => console.log(`   · ${c.nome}`));
  console.log('');
  console.log('Abra o painel em Conversas agora.');
  console.log('');

  await sleep(1500);

  const t0 = Date.now();
  for (let i = 0; i < timeline.length; i++) {
    const step = timeline[i];
    console.log(`[${i + 1}/${timeline.length}] 👤 ${step.nome}: ${step.text}`);
    try {
      await handleMessage(step.phone, step.text, fakeSock, {
        companyId: COMPANY_ID,
        rid: `demo-${i + 1}`,
        displayName: step.nome,
      });
      await setName(step.phone, step.nome);
    } catch (e) {
      console.error(`   ⚠ ${e.message}`);
    }
    if (i < timeline.length - 1) await sleep(step.delayAfter);
  }

  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  console.log('');
  console.log(`  OK em ${sec}s — no painel devem aparecer os nomes.`);
  console.log('  Destaque: Carlos Mendes → "quero atendente" (handoff).');
  console.log('');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
