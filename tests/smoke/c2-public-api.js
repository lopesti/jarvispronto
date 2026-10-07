// tests/smoke/c2-public-api.js — Camada 2: API pública
// Roda: node tests/smoke/c2-public-api.js

const { httpGet, check, section, summary, exitCode } = require('./lib/http');

(async () => {
  section('C2 — API PÚBLICA');

  // 2.1 /health
  let r = await httpGet('/health');
  check('/health status 200', r.status === 200, `HTTP ${r.status}`);
  let healthJson = null;
  try { healthJson = JSON.parse(r.text); } catch {}
  check('/health é JSON', !!healthJson, '');
  if (healthJson) {
    check('/health sem "product"', !('product' in healthJson), '');
    check('/health sem "mode"', !('mode' in healthJson), '');
  }

  // 2.2 /nginx-health
  r = await httpGet('/nginx-health');
  check('/nginx-health 200', r.status === 200, `HTTP ${r.status}`);
  check('/nginx-health corpo = "ok"', r.text.trim() === 'ok', `"${r.text.trim().slice(0, 20)}"`);

  // 2.3 /metrics (global)
  r = await httpGet('/metrics');
  check('/metrics 200', r.status === 200, `HTTP ${r.status}`);
  check('/metrics formato Prometheus', r.text.includes('# HELP'), '');

  // 2.4 /metrics?companyId=2
  r = await httpGet('/metrics?companyId=2');
  check('/metrics?companyId=2 200', r.status === 200, `HTTP ${r.status}`);
  check('/metrics?companyId=2 filtra tenant', r.text.includes('company_id="2"'), '');

  // 2.5 /qr (após BUG-075: bloco removido do nginx → 404 do frontend)
  r = await httpGet('/qr');
  check('/qr retorna 404 (rota oficial é /api/whatsapp/qr)', r.status === 404, `HTTP ${r.status}`);

  // 2.6 /api/inexistente (BUG-076: deve ser JSON, não HTML)
  r = await httpGet('/api/inexistente-xyz-123');
  check('/api/inexistente retorna 404', r.status === 404, `HTTP ${r.status}`);
  let notFoundJson = null;
  try { notFoundJson = JSON.parse(r.text); } catch {}
  check('/api/inexistente é JSON (BUG-076)', !!notFoundJson, '');
  if (notFoundJson) {
    check('/api/inexistente tem campo "error"', 'error' in notFoundJson, '');
  }

  summary('C2');
  exitCode();
})();
