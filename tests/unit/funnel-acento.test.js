const { normalizeText, classifyStep } = require('../../engine/utils/funnel');

describe('normalização de acentos do funil', () => {
  test('remove acentos e normaliza caixa e pontuação', () => {
    expect(normalizeText('NÃO quero, preço e cartão!'))
      .toBe('nao quero preco e cartao');
  });

  test('classifica corretamente texto com acentos', () => {
    expect(classifyStep('não quero esse preço', 'inicio')).toBe('perdido');
    expect(classifyStep('qual é o preço?', 'inicio')).toBe('interesse');
    expect(classifyStep('quero pagar no cartão', 'inicio')).toBe('fechamento');
  });

  test('mantém etapa atual para texto vazio', () => {
    expect(classifyStep('   ', 'interesse')).toBe('interesse');
  });
});
