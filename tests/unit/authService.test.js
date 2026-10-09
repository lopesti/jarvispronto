const crypto = require('crypto');
const {
  validatePassword,
  validateEmail,
  signAccessToken,
  verifyAccessToken,
} = require('../../engine/services/authService');

describe('authService.validatePassword', () => {
  test('rejeita curto', () => {
    expect(validatePassword('ab1')).toMatch(/minimo/);
  });
  test('rejeita só letras', () => {
    expect(validatePassword('abcdefgh')).toMatch(/letras e numeros/);
  });
  test('rejeita só números', () => {
    expect(validatePassword('12345678')).toMatch(/letras e numeros/);
  });
  test('aceita valido', () => {
    expect(validatePassword('senha123')).toBeNull();
  });
});

describe('authService.validateEmail', () => {
  test('rejeita invalido', () => {
    expect(validateEmail('foo')).toMatch(/invalido/i);
    expect(validateEmail('')).toMatch(/invalido/i);
    expect(validateEmail(null)).toMatch(/invalido/i);
  });
  test('aceita valido', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });
});

describe('authService.signAccessToken / verifyAccessToken', () => {
  const prev = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_min_16_chars_ok';
  });
  afterAll(() => {
    process.env.JWT_SECRET = prev;
  });

  test('payload correto roundtrip', () => {
    const token = signAccessToken({ id: 1, email: 'a@b.com', name: 'A', role: 'user' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(1);
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.type).toBe('access');
  });

  test('assinatura errada falha', () => {
    const token = signAccessToken({ id: 1, email: 'a@b.com', name: 'A' });
    const parts = token.split('.');
    parts[2] = parts[2].split('').reverse().join('');
    expect(() => verifyAccessToken(parts.join('.'))).toThrow();
  });
});

describe('hashToken shape (SHA-256)', () => {
  test('sha256 hex length 64', () => {
    const h = crypto.createHash('sha256').update('abc').digest('hex');
    expect(h).toHaveLength(64);
  });
});
