const path = require('path');
const fs = require('fs');

const BOT_CONFIG_PATH = path.resolve(__dirname, '../../bot_volumetrao.json');
let palavrasChave;

try {
  const config = JSON.parse(fs.readFileSync(BOT_CONFIG_PATH, 'utf-8'));
  palavrasChave = config.palavrasChave;
} catch (e) {
  console.warn('[INTENT] Falha ao carregar bot_volumetrao.json:', e.message);
  palavrasChave = {
    compra: ['quero', 'vou comprar', 'fechar', 'separar', 'pegar', 'manda', 'enviar', 'comprar'],
    preco: ['preço', 'quanto', 'valor', 'custa', 'oferta'],
    sim: ['sim', 'pode', 'quero', 'manda', 'fecha', 'ok', 'opa', 'bora'],
    nao: ['não', 'nao', 'recuso', 'dispenso', 'sem interesse'],
  };
}

/**
 * Detect intent from message text
 * @param {string} message
 * @returns {'compra'|'preco'|'sim'|'nao'|'desconhecido'}
 */
function detect(message) {
  if (!message) return 'desconhecido';
  const lower = message.toLowerCase();

  for (const [intent, keywords] of Object.entries(palavrasChave)) {
    if (keywords.some(k => lower.includes(k))) {
      return intent;
    }
  }

  return 'desconhecido';
}

module.exports = { detect };
