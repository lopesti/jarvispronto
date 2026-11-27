#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

const engineDir = path.join(__dirname, '..', 'engine');

if (!fs.existsSync(engineDir)) {
  console.error('ERRO: diretorio engine/ nao encontrado.');
  process.exit(1);
}

const files = collectFiles(engineDir);
let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.error || result.status !== 0) {
    failures++;
    console.error(`\nFAIL ${path.relative(process.cwd(), file)}`);

    if (result.error) console.error(result.error.message);
    if (result.stderr) console.error(result.stderr.trim());
    if (result.stdout) console.error(result.stdout.trim());
  }
}

console.log(`\nArquivos verificados: ${files.length}`);
console.log(`Falhas: ${failures}`);

if (failures > 0) {
  console.error('LINT REPROVADO.');
  process.exit(1);
}

console.log('LINT BACKEND APROVADO.');
