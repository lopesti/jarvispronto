// tests/smoke/c1-infra.js — Camada 1: Infra
// Roda: node tests/smoke/c1-infra.js

const { execSync } = require('child_process');
const { httpGet, httpGetPlain, check, section, summary, exitCode } = require('./lib/http');

(async () => {
  section('C1 — INFRA');

  // 1.1 Containers Up
  const containers = ['api', 'worker', 'nginx', 'postgres', 'redis', 'frontend'];
  try {
    const ps = execSync('docker compose ps --format "{{.Service}}|{{.Status}}"', { encoding: 'utf8' });
    const lines = ps.trim().split('\n');
    const map = {};
    lines.forEach((l) => {
      const [svc, status] = l.split('|');
      map[svc] = status || '';
    });
    for (const c of containers) {
      const st = map[c] || '(não encontrado)';
      check(`container ${c}`, st.startsWith('Up'), st);
    }
  } catch (e) {
    check('docker compose ps', false, e.message);
  }

  // 1.2 HTTP → HTTPS (em HTTP puro, deve redirecionar 301)
  try {
    const r = await httpGetPlain('/');
    check('HTTP → HTTPS', r.status === 301, `HTTP ${r.status}`);
  } catch (e) {
    check('HTTP → HTTPS', false, e.message);
  }

  // 1.3 HTTPS responde
  try {
    const r = await httpGet('/');
    check('HTTPS responde', r.status === 200, `HTTP ${r.status}`);
  } catch (e) {
    check('HTTPS responde', false, e.message);
  }

  summary('C1');
  exitCode();
})();