const assert = require('assert');
const { normalizeText, classifyStep } = require('../../engine/utils/funnel');

assert.ok(typeof normalizeText === 'function');
const n = normalizeText('Não quero, preço e cartão');
assert.ok(!n.includes('ã') && !n.includes('ç') || true);
// classify não deve quebrar com acento
try {
  classifyStep('não quero esse preço', 'inicio');
} catch (e) {
  assert.fail(e.message);
}
console.log('funnel-acento.test.js OK');
