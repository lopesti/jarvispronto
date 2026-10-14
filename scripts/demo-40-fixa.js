const messageController = require('../engine/controllers/messageController');
const COMPANY_ID = 1;

const ROTEIROS = [
  { perfil: 'DESCONFIADO', cor: '\x1b[33m', msgs: ['oi, isso e golpe?', 'tem garantia mesmo?'] },
  { perfil: 'APRESSADO', cor: '\x1b[31m', msgs: ['quanto custa?', 'aceita pix?'] },
  { perfil: 'INDECISO', cor: '\x1b[35m', msgs: ['qual voce recomenda?', 'vale a pena o kit 2?'] },
  { perfil: 'REVOLTADO', cor: '\x1b[91m', msgs: ['comprei e nao chegou nada!', 'quero resolver isso'] },
  { perfil: 'CURIOSO', cor: '\x1b[36m', msgs: ['quais as cores?', 'quanto tempo dura?'] },
  { perfil: 'COMPARADOR', cor: '\x1b[94m', msgs: ['qual a diferenca entre kit 1 e 2?', 'por que o kit 3 e mais caro?'] },
  { perfil: 'ECONOMICO', cor: '\x1b[32m', msgs: ['tem desconto?', 'qual o mais barato?'] },
  { perfil: 'VIP', cor: '\x1b[95m', msgs: ['tem atendimento premium?', 'quero entrega expressa'] },
];

const RESET = '\x1b[0m', CYAN = '\x1b[36m', GREEN = '\x1b[32m', DIM = '\x1b[2m';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { clientes: 0, respostas: 0 };

async function rodaCliente(rot, idx) {
  const phone = `551190000${String(idx + 1).padStart(4, '0')}@s.whatsapp.net`;
  const fakeSock = {
    sendMessage: async (to, msg) => {
      stats.respostas++;
      const l = String(msg.text).split('\n')[0].slice(0, 100);
      console.log(GREEN + '    JARVIS:' + RESET + ' ' + l);
    },
  };
  for (const p of rot.msgs) {
    console.log('\n' + rot.cor + `    [${rot.perfil}] ${p}` + RESET);
    try {
      await messageController.handleMessage(phone, p, fakeSock, { companyId: COMPANY_ID, rid: `demo-${idx}` });
    } catch (e) { console.log(DIM + '    erro: ' + e.message.slice(0, 60) + RESET); }
    await sleep(300);
  }
  stats.clientes++;
}

(async () => {
  console.log('\n' + CYAN + '═══ DEMO: 40 clientes (perguntas fixas) ═══' + RESET);
  const inicio = Date.now();
  for (let i = 0; i < 40; i++) {
    const rot = ROTEIROS[i % ROTEIROS.length];
    console.log('\n' + DIM + `  Cliente #${i + 1}/40 [${rot.perfil}]` + RESET);
    await rodaCliente(rot, i);
    if ((i + 1) % 5 === 0 && i < 39) {
      console.log('\n' + DIM + '  ⏸️  10s...' + RESET);
      await sleep(10000);
    }
  }
  const t = Math.round((Date.now() - inicio) / 1000);
  console.log('\n' + CYAN + '═══════════════════════════════════════════════' + RESET);
  console.log(GREEN + `  ✅ ${stats.clientes} clientes | ${stats.respostas} respostas | ${t}s` + RESET);
  console.log(CYAN + '═══════════════════════════════════════════════\n' + RESET);
  process.exit(0);
})();
