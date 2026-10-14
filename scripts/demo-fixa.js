require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const messageController = require('../engine/controllers/messageController');

const COMPANY_ID = 1;

const CONVERSAS = [
  {
    phone: '5511900000001@s.whatsapp.net',
    perfil: 'DESCONFIADO',
    cor: '\x1b[33m',
    msgs: [
      'oi, isso nao e golpe nao ne?',
      'como sei que voces sao confiaveis?',
      'tem garantia mesmo? quanto tempo?',
      'se nao gostar posso devolver?',
    ],
  },
  {
    phone: '5511900000002@s.whatsapp.net',
    perfil: 'APRESSADO',
    cor: '\x1b[31m',
    msgs: [
      'quanto custa?',
      'aceita pix?',
      'quero o kit 2, como pago agora?',
      'manda o link que eu pago',
    ],
  },
  {
    phone: '5511900000003@s.whatsapp.net',
    perfil: 'INDECISO',
    cor: '\x1b[35m',
    msgs: [
      'boa tarde, vi voces no instagram',
      'qual kit voces recomendam?',
      'a diferenca entre o kit 1 e o 2 vale a pena?',
      'hmm deixa eu pensar... ta bom vou querer',
    ],
  },
];

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';

async function runCliente(c) {
  const fakeSock = {
    sendMessage: async (to, msg) => {
      console.log(GREEN + '  JARVIS [' + c.perfil + ']:' + RESET + ' ' + msg.text);
    },
  };
  for (let i = 0; i < c.msgs.length; i++) {
    const msg = c.msgs[i];
    console.log('\n' + c.cor + 'CLIENTE [' + c.perfil + ']:' + RESET + ' ' + msg);
    await messageController.handleMessage(c.phone, msg, fakeSock, {
      companyId: COMPANY_ID,
      rid: 'demo-' + c.perfil + '-' + i,
    });
    await new Promise((r) => setTimeout(r, 1500));
  }
}

(async () => {
  console.log('\n' + CYAN + '═══════════════════════════════════════════════════════════' + RESET);
  console.log(CYAN + '   DEMO: 3 clientes simultaneos x Jarvis' + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════════════════' + RESET);
  await Promise.all(CONVERSAS.map(runCliente));
  console.log('\n' + CYAN + '═══════════════════════════════════════════════════════════' + RESET);
  console.log(GREEN + '   ✅  Fim' + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════════════════\n' + RESET);
  process.exit(0);
})();
