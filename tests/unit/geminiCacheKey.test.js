const { buildCacheKey } = require('../../engine/services/geminiService');

describe('buildCacheKey (multi-tenant)', () => {
  test('mesma pergunta + mesmo tenant → mesma chave', () => {
    const a = buildCacheKey('preco?', 1);
    const b = buildCacheKey('preco?', 1);
    expect(a).toBe(b);
  });

  test('mesma pergunta em tenants diferentes → chaves diferentes', () => {
    const a = buildCacheKey('preco?', 1);
    const b = buildCacheKey('preco?', 2);
    expect(a).not.toBe(b);
  });

  test('perguntas diferentes + mesmo tenant → chaves diferentes', () => {
    const a = buildCacheKey('preco?', 1);
    const b = buildCacheKey('entrega?', 1);
    expect(a).not.toBe(b);
  });

  test('normalização: "preco?" == "PREÇO" == " preco "', () => {
    const a = buildCacheKey('preco?', 1);
    const b = buildCacheKey('PREÇO', 1);
    const c = buildCacheKey('  preco  ', 1);
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  test('tenant ausente → chave com companyId=0', () => {
    const a = buildCacheKey('preco?');           // sem companyId
    const b = buildCacheKey('preco?', 0);        // com companyId=0
    expect(a).toBe(b);
    expect(a).toMatch(/^ia:0:/);
  });

  test('formato da chave: ia:{companyId}:{hash16}', () => {
    const key = buildCacheKey('teste', 42);
    expect(key).toMatch(/^ia:42:[a-f0-9]{16}$/);
  });

  test('input vazio → chave estável (não lança erro)', () => {
    const a = buildCacheKey('', 1);
    const b = buildCacheKey('', 1);
    expect(a).toBe(b);
  });
});