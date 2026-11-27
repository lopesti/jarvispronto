const crypto = require('crypto');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

describe('comparação segura de tokens', () => {
  test('aceita tokens iguais', () => {
    expect(safeEqual('secret', 'secret')).toBe(true);
  });

  test('rejeita tokens diferentes', () => {
    expect(safeEqual('secret', 'wrong')).toBe(false);
  });

  test('rejeita comprimentos diferentes e valores vazios', () => {
    expect(safeEqual('', 'x')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
