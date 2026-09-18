const path = require('path');
const fs = require('fs');

let activationKeywords = [];

function loadActivationKeywords() {
  try {
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../bot_volumetrao.json'), 'utf8'));
    activationKeywords = config.activation_keywords || [];
  } catch (err) {
    activationKeywords = ['quero comprar', 'tenho interesse'];
  }
}

function isActivationMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return activationKeywords.some(kw => lower.includes(kw));
}

module.exports = { loadActivationKeywords, isActivationMessage };