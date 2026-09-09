const path = require('path');
const fs = require('fs');

const BLACKLIST_FILE = path.resolve(__dirname, '../../data/blacklist.json');

function ensureDir() {
  const dir = path.dirname(BLACKLIST_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadBlacklist() {
  ensureDir();
  if (!fs.existsSync(BLACKLIST_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8')); } catch { return []; }
}

function saveBlacklist(list) { ensureDir(); fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(list, null, 2)); }

function isBlocked(phone) { return loadBlacklist().includes(phone); }
function addToBlacklist(phone) { const list = loadBlacklist(); if (!list.includes(phone)) { list.push(phone); saveBlacklist(list); return true; } return false; }
function removeFromBlacklist(phone) { let list = loadBlacklist(); if (list.includes(phone)) { list = list.filter(p => p !== phone); saveBlacklist(list); return true; } return false; }
function getAllBlacklist() { return loadBlacklist(); }

module.exports = { isBlocked, addToBlacklist, removeFromBlacklist, getAllBlacklist };