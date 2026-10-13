#!/usr/bin/env node
/**
 * O-07 — lint real do backend: syntax check de todos os .js em engine/
 * (sem dependência extra de ESLint no MVP; CI-friendly)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, out);
    } else if (name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

const root = path.join(__dirname, '..', 'engine');
if (!fs.existsSync(root)) {
  console.error('engine/ não encontrado');
  process.exit(1);
}

const files = walk(root);
let failed = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${f}`);
    if (e.stderr) process.stderr.write(e.stderr);
  }
}

if (failed) {
  console.error(`\nlint: ${failed}/${files.length} arquivo(s) com erro de sintaxe`);
  process.exit(1);
}
console.log(`lint ok — ${files.length} arquivos JS (node --check)`);
