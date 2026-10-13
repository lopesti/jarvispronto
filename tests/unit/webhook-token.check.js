const assert = require('assert');
const crypto = require('crypto');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

assert.strictEqual(safeEqual('secret', 'secret'), true);
assert.strictEqual(safeEqual('secret', 'wrong'), false);
assert.strictEqual(safeEqual('', 'x'), false);
console.log('webhook-token.test.js OK');
