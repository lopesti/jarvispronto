// tests/smoke/c5-tenant.js — Camada 5: Isolamento multi-tenant
// Roda: node tests/smoke/c5-tenant.js
//
// Prova que Company A NÃO vê dados de Company B.
// Baseado no contrato real de auth.js, produtos.js, conversations.js, companies.js.

const { httpGet, httpPost, check, section, summary, exitCode } = require('./lib/http');

// Helper pra PUT/PATCH/DELETE (o lib/http só tem GET e POST)
const https = require('https');
function httpRequest(method, path, body, opts = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(`https://localhost${path}`);
    const req = https.request({
      method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(opts.headers || {}),
      },
      rejectUnauthorized: false,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, text: buf }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  section('C5 — ISOLAMENTO MULTI-TENANT');

  const stamp = Date.now();
  const emailA = `c5-a-${stamp}@jarvis.local`;
  const emailB = `c5-b-${stamp}@jarvis.local`;
  const password = 'SenhaForte123!';

  // ═══════════════════════════════════════════════════════════
  // C5.1 — Registra 2 empresas isoladas
  // ═══════════════════════════════════════════════════════════
  let tokenA, tokenB, companyA, companyB;

  const regA = await httpPost('/auth/register', { name: 'Tenant A', email: emailA, password });
  const jsonA = JSON.parse(regA.text);
  tokenA = jsonA.token || jsonA.accessToken;
  companyA = jsonA.user?.companyId;

  check('C5.1.1 register A → 201', regA.status === 201, `HTTP ${regA.status}`);
  check('C5.1.2 register A → token', !!tokenA, tokenA ? `len=${tokenA.length}` : 'VAZIO');
  check('C5.1.3 register A → companyId', !!companyA, `companyId=${companyA}`);

  const regB = await httpPost('/auth/register', { name: 'Tenant B', email: emailB, password });
  const jsonB = JSON.parse(regB.text);
  tokenB = jsonB.token || jsonB.accessToken;
  companyB = jsonB.user?.companyId;

  check('C5.1.4 register B → 201', regB.status === 201, `HTTP ${regB.status}`);
  check('C5.1.5 register B → token', !!tokenB, tokenB ? `len=${tokenB.length}` : 'VAZIO');
  check('C5.1.6 register B → companyId', !!companyB, `companyId=${companyB}`);

  // 🔥 BLOQUEANTE: companies têm IDs diferentes
  check('C5.1.7 companyId A ≠ B (BLOQUEANTE)', companyA !== companyB, `A=${companyA} B=${companyB}`);

  // Se falhou o bloqueante, para aqui
  if (companyA === companyB) {
    summary('C5');
    exitCode();
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // C5.2 — Sem Bearer → 401
  // ═══════════════════════════════════════════════════════════
  const noToken = await httpGet('/api/produtos');
  check('C5.2.1 /api/produtos sem token → 401', noToken.status === 401, `HTTP ${noToken.status}`);

  const badToken = await httpGet('/api/produtos', { headers: { Authorization: 'Bearer lixo' } });
  check('C5.2.2 /api/produtos token falso → 401', badToken.status === 401, `HTTP ${badToken.status}`);

  // ═══════════════════════════════════════════════════════════
  // C5.3 — Produtos isolados
  // ═══════════════════════════════════════════════════════════
  // A cria produto
  const createProd = await httpPost(
    '/api/produtos',
    { nome: `Produto-A-${stamp}`, preco: 99.9, descricao: 'do A' },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  let produtoAId = null;
  try {
    const p = JSON.parse(createProd.text);
    produtoAId = p.id || p.produto?.id;
  } catch {}
  check('C5.3.1 A cria produto → 2xx', createProd.status >= 200 && createProd.status < 300, `HTTP ${createProd.status}`);
  check('C5.3.2 A cria produto → id', !!produtoAId, `id=${produtoAId}`);

  // A lista — vê o próprio
  const listA = await httpGet('/api/produtos', { headers: { Authorization: `Bearer ${tokenA}` } });
  check('C5.3.3 A lista produtos → 200', listA.status === 200, `HTTP ${listA.status}`);
  check('C5.3.4 A vê o próprio produto', listA.text.includes(`Produto-A-${stamp}`), '');

  // 🔥 B lista — NÃO pode ver o produto de A
  const listB = await httpGet('/api/produtos', { headers: { Authorization: `Bearer ${tokenB}` } });
  check('C5.3.5 B lista produtos → 200', listB.status === 200, `HTTP ${listB.status}`);
  check('C5.3.6 B NÃO vê produto de A (BLOQUEANTE)', !listB.text.includes(`Produto-A-${stamp}`), '');

  // 🔥 B tenta GET direto pelo ID de A
  if (produtoAId) {
    const getB = await httpGet(`/api/produtos/${produtoAId}`, { headers: { Authorization: `Bearer ${tokenB}` } });
    check('C5.3.7 B GET produto de A → 403/404 (BLOQUEANTE)', [403, 404].includes(getB.status), `HTTP ${getB.status}`);

    // 🔥 B tenta PUT no produto de A
    const putB = await httpRequest('PUT', `/api/produtos/${produtoAId}`,
      { nome: 'HACKED', preco: 1 },
      { headers: { Authorization: `Bearer ${tokenB}` } });
    check('C5.3.8 B PUT produto de A → 403/404 (BLOQUEANTE)', [403, 404].includes(putB.status), `HTTP ${putB.status}`);

    // 🔥 B tenta DELETE no produto de A
    const delB = await httpRequest('DELETE', `/api/produtos/${produtoAId}`, null,
      { headers: { Authorization: `Bearer ${tokenB}` } });
    check('C5.3.9 B DELETE produto de A → 403/404 (BLOQUEANTE)', [403, 404].includes(delB.status), `HTTP ${delB.status}`);
  }

  // ═══════════════════════════════════════════════════════════
  // C5.4 — Conversas isoladas (A e B sem interseção de IDs)
  // ═══════════════════════════════════════════════════════════
  const convA = await httpGet('/api/conversations', { headers: { Authorization: `Bearer ${tokenA}` } });
  const convB = await httpGet('/api/conversations', { headers: { Authorization: `Bearer ${tokenB}` } });
  check('C5.4.1 A lista conversas → 200', convA.status === 200, `HTTP ${convA.status}`);
  check('C5.4.2 B lista conversas → 200', convB.status === 200, `HTTP ${convB.status}`);

  // Extrai IDs de conversa das duas listas (se houver)
  const idsFrom = (text) => {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (parsed.conversations || parsed.data || []);
      return arr.map((c) => c.id).filter(Boolean);
    } catch { return []; }
  };
  const idsA = new Set(idsFrom(convA.text));
  const idsB = new Set(idsFrom(convB.text));
  const inter = [...idsA].filter((id) => idsB.has(id));
  check('C5.4.3 Sem interseção de IDs de conversa', inter.length === 0, `intersecção=${inter.length}`);

  // ═══════════════════════════════════════════════════════════
  // C5.5 — Users sem vazar email cross-tenant
  // ═══════════════════════════════════════════════════════════
  const usersA = await httpGet('/api/users', { headers: { Authorization: `Bearer ${tokenA}` } });
  if (usersA.status === 200) {
    check('C5.5.1 A NÃO vê email de B', !usersA.text.includes(emailB), '');
  } else {
    check('C5.5.1 /api/users status', [200, 404].includes(usersA.status), `HTTP ${usersA.status}`);
  }

  // ═══════════════════════════════════════════════════════════
  // C5.6 — Config de companies
  // ═══════════════════════════════════════════════════════════
  // A lê seu próprio config → 200
  const cfgA = await httpGet(`/api/companies/${companyA}/config`, { headers: { Authorization: `Bearer ${tokenA}` } });
  check('C5.6.1 A lê config de A → 200', cfgA.status === 200, `HTTP ${cfgA.status}`);

  // 🔥 B tenta ler config de A → 403 (mesmo tenant check)
  const cfgBA = await httpGet(`/api/companies/${companyA}/config`, { headers: { Authorization: `Bearer ${tokenB}` } });
  check('C5.6.2 B lê config de A → 403', cfgBA.status === 403, `HTTP ${cfgBA.status}`);

  // ═══════════════════════════════════════════════════════════
  // C5.7 — WhatsApp status por tenant
  // ═══════════════════════════════════════════════════════════
  const waA = await httpGet('/api/whatsapp/status', { headers: { Authorization: `Bearer ${tokenA}` } });
  const waB = await httpGet('/api/whatsapp/status', { headers: { Authorization: `Bearer ${tokenB}` } });
  check('C5.7.1 A → status WA', waA.status === 200, `HTTP ${waA.status}`);
  check('C5.7.2 B → status WA', waB.status === 200, `HTTP ${waB.status}`);

  const waNoToken = await httpGet('/api/whatsapp/status');
  check('C5.7.3 WA sem token → 401', waNoToken.status === 401, `HTTP ${waNoToken.status}`);

  summary('C5');
  exitCode();
})().catch((err) => {
  console.error('\n❌ Erro fatal no C5:', err.message);
  process.exit(1);
});