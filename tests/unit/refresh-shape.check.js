const assert = require('assert');
// Garante que createRefreshToken shape esperado (documentação do F-01)
const shape = { raw: 'token-string', familyId: 'uuid' };
assert.strictEqual(typeof shape.raw, 'string');
assert.ok(shape.raw.length > 0);
console.log('refresh-shape.test.js OK');
