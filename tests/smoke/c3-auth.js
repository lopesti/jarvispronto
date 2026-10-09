// tests/smoke/c3-auth.js — Camada 3: Auth (barreiras)
// Roda: node tests/smoke/c3-auth.js

const { httpGet, httpPost, check, section, summary, exitCode } = require('./lib/http');

(async () => {
  section('C3 — AUTH');

  // 3.1 Rotas privadas sem token → 401
  const privadas = [
    '/api/conversations',
    '/api/produtos',
    '/api/whatsapp/status',
    '/api/companies',
    '/api/channels',
  ];
  for (const p of privadas) {
    const r = await httpGet(p);
    check(`sem token ${p}`, r.status === 401, `HTTP ${r.status}`);
  }

  // 3.2 Token inválido → 401
  for (const p of ['/api/conversations', '/api/produtos', '/api/whatsapp/status']) {
    const r = await httpGet(p, { headers: { Authorization: 'Bearer token_falso_abc123' } });
    check(`token inválido ${p}`, r.status === 401, `HTTP ${r.status}`);
  }

  // 3.3 Token sem "Bearer" → 401
  let r = await httpGet('/api/conversations', { headers: { Authorization: 'token_sem_bearer' } });
  check('token sem Bearer', r.status === 401, `HTTP ${r.status}`);

  // 3.4 Login inválido → 401
  r = await httpPost('/auth/login', { email: 'naoexiste@x.com', password: 'senhaerrada' });
  check('login inválido', r.status === 401 || r.status === 400, `HTTP ${r.status}`);

  summary('C3');
  exitCode();
})();
