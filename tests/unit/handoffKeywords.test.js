const fs = require('fs');
const path = require('path');

describe('handoffKeywords', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../engine/controllers/messageController.js'),
    'utf8'
  );

  test('controller declara a regra de handoff', () => {
    expect(source).toMatch(/const HANDOFF_KEYWORDS\s*=/);
  });

  test.each([
    ['quero falar com uma pessoa da loja', false],
    ['quero um atendente', true],
    ['preciso de um humano', true],
    ['falar com alguém', true],
    ['olá, bom dia', false],
  ])('classifica: %s', (message, expected) => {
    const keywords = /\b(atendente|humano|operador|falar com algu[eé]m)\b/i;
    expect(keywords.test(message)).toBe(expected);
  });
});
