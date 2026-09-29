const path = require('path');
const fs = require('fs');

function _fileFor(companyId) {
  const cid = Number(companyId);
  if (!cid || Number.isNaN(cid)) {
    throw new Error('blacklistService: companyId obrigatorio');
  }
  return path.resolve(__dirname, `../../data/blacklist/company_${cid}.json`);
}

function _ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function _load(companyId) {
  const file = _fileFor(companyId);
  _ensureDir(file);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function _save(companyId, list) {
  const file = _fileFor(companyId);
  _ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}

function isBlocked(companyId, phone) {
  return _load(companyId).includes(phone);
}

function addToBlacklist(companyId, phone) {
  const list = _load(companyId);
  if (!list.includes(phone)) {
    list.push(phone);
    _save(companyId, list);
    return true;
  }
  return false;
}

function removeFromBlacklist(companyId, phone) {
  const list = _load(companyId);
  if (list.includes(phone)) {
    _save(companyId, list.filter((p) => p !== phone));
    return true;
  }
  return false;
}

function getAllBlacklist(companyId) {
  return _load(companyId);
}

module.exports = {
  isBlocked,
  addToBlacklist,
  removeFromBlacklist,
  getAllBlacklist,
};