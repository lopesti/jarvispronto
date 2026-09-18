const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.resolve(__dirname, '../../data/conversations.json');
const dir = path.dirname(MEMORY_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function loadAllMemories() {
  if (!fs.existsSync(MEMORY_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch (e) {
    console.error('[MEMORY] Erro ao carregar:', e.message);
    return {};
  }
}

function getMemory(phone) {
  return loadAllMemories()[phone] || null;
}

function updateMemory(phone, data) {
  const memories = loadAllMemories();
  memories[phone] = { ...memories[phone], ...data, updatedAt: new Date().toISOString() };
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

function deleteMemory(phone) {
  const memories = loadAllMemories();
  delete memories[phone];
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

// Nova função para listar todas as conversas
function getAllMemories() {
  return loadAllMemories();
}

module.exports = { getMemory, updateMemory, deleteMemory, getAllMemories };