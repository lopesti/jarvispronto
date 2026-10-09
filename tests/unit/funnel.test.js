const { classifyStep, scoreForStep, STEPS, STEP_LABELS } = require('../../engine/utils/funnel');

describe('funnel.classifyStep', () => {
  test('inicio → qualificacao com saudacao', () => {
    expect(classifyStep('ola', 'inicio')).toBe('qualificacao');
    expect(classifyStep('bom dia', 'inicio')).toBe('qualificacao');
  });

  test('detecta interesse por preco', () => {
    expect(classifyStep('quanto custa?', 'qualificacao')).toBe('interesse');
    expect(classifyStep('tem desconto?', 'qualificacao')).toBe('interesse');
  });

  test('detecta objecao', () => {
    expect(classifyStep('esta caro', 'interesse')).toBe('objecao');
    expect(classifyStep('vou pensar', 'interesse')).toBe('objecao');
  });

  test('detecta fechamento', () => {
    expect(classifyStep('quero comprar agora', 'interesse')).toBe('fechamento');
    expect(classifyStep('pode mandar o pix', 'interesse')).toBe('fechamento');
  });

  test('detecta vendido', () => {
    expect(classifyStep('ja paguei', 'fechamento')).toBe('vendido');
    expect(classifyStep('pedido feito', 'fechamento')).toBe('vendido');
  });

  test('detecta perdido', () => {
    expect(classifyStep('nao quero', 'interesse')).toBe('perdido');
    expect(classifyStep('sem interesse', 'qualificacao')).toBe('perdido');
  });

  test('mantem step se texto vazio', () => {
    expect(classifyStep('', 'interesse')).toBe('interesse');
    expect(classifyStep(null, 'fechamento')).toBe('fechamento');
  });
});

describe('funnel.scoreForStep', () => {
  test('scores conhecidos', () => {
    expect(scoreForStep('inicio')).toBe(10);
    expect(scoreForStep('qualificacao')).toBe(30);
    expect(scoreForStep('interesse')).toBe(55);
    expect(scoreForStep('fechamento')).toBe(80);
    expect(scoreForStep('vendido')).toBe(100);
    expect(scoreForStep('perdido')).toBe(0);
  });

  test('step desconhecido retorna default', () => {
    expect(scoreForStep('xyz')).toBe(20);
  });
});

describe('funnel constants', () => {
  test('STEPS e STEP_LABELS alinhados', () => {
    STEPS.forEach((s) => {
      expect(STEP_LABELS[s]).toBeDefined();
    });
  });
});
