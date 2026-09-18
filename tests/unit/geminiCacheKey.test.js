const { buildCacheKey } = require('../../engine/services/geminiService');

describe('buildCacheKey', () => {
  test('mesma pergunta com históricos diferentes → chaves diferentes', () => {
    const a = buildCacheKey('preco?', [{ role: 'user', content: 'oi' }]);
    const b = buildCacheKey('preco?', [{ role: 'user', content: 'ola' }, { role: 'assistant', content: 'x' }]);
    expect(a).not.toBe(b);
  });
  test('mesma pergunta e mesmo histórico → mesma chave', () => {
    const h = [{ role: 'user', content: 'oi' }];
    expect(buildCacheKey('preco?', h)).toBe(buildCacheKey('preco?', h));
  });
});
