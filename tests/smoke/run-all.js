// tests/smoke/run-all.js — orquestrador C1 → C2 → C3
// Roda: node tests/smoke/run-all.js

const { spawnSync } = require('child_process');
const path = require('path');

const camadas = [
  { nome: 'C1 (Infra)',       file: 'c1-infra.js' },
  { nome: 'C2 (API pública)', file: 'c2-public-api.js' },
  { nome: 'C3 (Auth)',        file: 'c3-auth.js' },
];

const results = [];
for (const c of camadas) {
  const file = path.join(__dirname, c.file);
  const r = spawnSync('node', [file], { stdio: 'inherit' });
  results.push({ nome: c.nome, code: r.status });
  if (r.status !== 0) {
    console.log(`\n\x1b[31m❌ ${c.nome} falhou. Parando (camadas posteriores dependem desta).\x1b[0m`);
    process.exit(1);
  }
}

console.log('\n\x1b[32m═══════════════════════════════════════\x1b[0m');
console.log('\x1b[32m✅ Todas as camadas C1-C3 passaram\x1b[0m');
console.log('\x1b[32m═══════════════════════════════════════\x1b[0m');
process.exit(0);
