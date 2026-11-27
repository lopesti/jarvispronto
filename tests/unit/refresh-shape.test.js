jest.mock('../../engine/models/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

const crypto = require('crypto');
const { query } = require('../../engine/models/database');
const { createRefreshToken } = require('../../engine/services/authService');

describe('createRefreshToken', () => {
  test('gera token, hash SHA-256, validade e familyId', async () => {
    const result = await createRefreshToken(123, 'familia-teste');

    expect(result.raw).toMatch(/^[a-f0-9]{96}$/);
    expect(result.familyId).toBe('familia-teste');
    expect(query).toHaveBeenCalledTimes(1);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO refresh_tokens/);
    expect(params[0]).toBe(123);
    expect(params[1]).toBe(
      crypto.createHash('sha256').update(result.raw).digest('hex')
    );
    expect(params[2]).toBeInstanceOf(Date);
    expect(params[2].getTime()).toBeGreaterThan(Date.now());
    expect(params[3]).toBe('familia-teste');
  });

  test('gera familyId quando não informado', async () => {
    query.mockClear();
    const result = await createRefreshToken(456);

    expect(result.familyId).toMatch(/^[a-f0-9]{32}$/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
