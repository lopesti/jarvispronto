const botConfig = require('../../bot_volumetrao.json');

function calculateScore(message) {
  const lower = message.toLowerCase();
  let score = 0;
  for (const rule of botConfig.leadScoreRules || []) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      score += rule.points;
    }
  }
  return score;
}

function shouldGoToOffer(score) {
  const rule = botConfig.automationRules?.find(r => r.action === 'IR_PARA_OFERTA');
  return rule ? score >= rule.score : false;
}

function shouldGoToCheckout(score) {
  const rule = botConfig.automationRules?.find(r => r.action === 'IR_PARA_FECHAMENTO');
  return rule ? score >= rule.score : false;
}

module.exports = { calculateScore, shouldGoToOffer, shouldGoToCheckout };