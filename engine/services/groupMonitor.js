const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../../data/group_insights');

function ensureDir() {
  if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
}

function filePathFor(companyId) {
  const cid = Number(companyId) || 0;
  return path.join(BASE_DIR, `company_${cid}.json`);
}

function loadInsights(companyId) {
  ensureDir();
  const file = filePathFor(companyId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveInsights(companyId, insights) {
  ensureDir();
  fs.writeFileSync(filePathFor(companyId), JSON.stringify(insights, null, 2));
}

function addInsight(companyId, groupName, message, sender, timestamp) {
  const cid = Number(companyId) || 0;
  const insights = loadInsights(cid);
  insights.push({
    companyId: cid,
    groupName,
    sender,
    message,
    timestamp: timestamp || new Date().toISOString(),
    type: 'extracted',
  });
  if (insights.length > 1000) insights.shift();
  saveInsights(cid, insights);
}

function extractKeywords(message) {
  const lower = message.toLowerCase();
  const keywords = {
    preco: ['preco', 'valor', 'quanto custa', 'oferta', 'desconto'],
    objecao: ['caro', 'golpe', 'confianca', 'duvida', 'pensar', 'depois'],
    tecnica: ['fechar', 'argumento', 'persuasao', 'gatilho', 'escassez', 'urgencia', 'prova social'],
    produto: ['funciona', 'resultado', 'depoimento', 'garantia', 'entrega'],
  };
  const found = [];
  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some((w) => lower.includes(w))) found.push(cat);
  }
  return found;
}

function processGroupMessage(companyId, groupName, sender, message) {
  if (!companyId || Number.isNaN(Number(companyId))) {
    return;
  }
  if (extractKeywords(message).length > 0) {
    addInsight(companyId, groupName, message, sender, new Date().toISOString());
    console.log(
      `[GROUP MONITOR][company=${companyId}] Insight de ${groupName}: ${message.substring(0, 80)}`
    );
  }
}

module.exports = { processGroupMessage, loadInsights };
