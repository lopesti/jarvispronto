const fs = require('fs');
const path = require('path');
const EXTRACTED_DATA_FILE = path.resolve(__dirname, '../../data/group_insights.json');

function ensureDir() {
  const dir = path.dirname(EXTRACTED_DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadInsights() {
  ensureDir();
  if (!fs.existsSync(EXTRACTED_DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(EXTRACTED_DATA_FILE, 'utf8')); } catch { return []; }
}

function saveInsights(insights) { ensureDir(); fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify(insights, null, 2)); }

function addInsight(groupName, message, sender, timestamp) {
  const insights = loadInsights();
  insights.push({ groupName, sender, message, timestamp: timestamp || new Date().toISOString(), type: 'extracted' });
  if (insights.length > 1000) insights.shift();
  saveInsights(insights);
}

function extractKeywords(message) {
  const lower = message.toLowerCase();
  const keywords = {
    preco: ['preço', 'valor', 'quanto custa', 'oferta', 'desconto'],
    objeção: ['caro', 'golpe', 'confiança', 'duvida', 'pensar', 'depois'],
    tecnica: ['fechar', 'argumento', 'persuasão', 'gatilho', 'escassez', 'urgência', 'prova social'],
    produto: ['funciona', 'resultado', 'depoimento', 'garantia', 'entrega']
  };
  const found = [];
  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) found.push(cat);
  }
  return found;
}

function processGroupMessage(groupName, sender, message) {
  if (extractKeywords(message).length > 0) {
    addInsight(groupName, message, sender, new Date().toISOString());
    console.log(`[GROUP MONITOR] Insight de ${groupName}: ${message.substring(0, 80)}`);
  }
}

module.exports = { processGroupMessage, loadInsights };