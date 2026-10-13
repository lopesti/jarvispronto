/**
 * F-09: handoff não deve disparar em palavra comum "pessoa"
 */
const assert = require('assert');

const HANDOFF_KEYWORDS = /\b(atendente|humano|operador|falar com algu[eé]m)\b/i;

assert.strictEqual(HANDOFF_KEYWORDS.test('quero falar com uma pessoa da loja'), false);
assert.strictEqual(HANDOFF_KEYWORDS.test('quero um atendente'), true);
assert.strictEqual(HANDOFF_KEYWORDS.test('preciso de um humano'), true);
assert.strictEqual(HANDOFF_KEYWORDS.test('falar com alguém'), true);
assert.strictEqual(HANDOFF_KEYWORDS.test('olá, bom dia'), false);

console.log('handoffKeywords.test.js OK');
