/**
 * seed-company-config.js
 * BUG-009 — popula companies.config->>'systemPrompt' e 'fallbackMessage'
 * com o conteúdo atual do bot_volumetrao.json, SOMENTE nas empresas
 * que ainda estão com config = {} (idempotente, pode rodar 2x).
 *
 * Uso:
 *   docker cp scripts/seed-company-config.js jarvis-api:/app/scripts/seed-company-config.js
 *   docker compose exec -T api node /app/scripts/seed-company-config.js
 *   docker compose exec -T api node /app/scripts/seed-company-config.js --force   # sobrescreve
 */
const fs = require('fs');
const path = require('path');

// Dentro do container o cwd é /app, e o código fica em /app/engine/...
// Este arquivo roda em /app/scripts/seed-company-config.js
// Então '../engine/models/database' resolve para /app/engine/models/database.js
let db;
try {
  db = require('../engine/models/database');
} catch (e1) {
  console.error('❌ Falha ao carregar ../engine/models/database:', e1.message);
  console.error('   Tentando caminhos alternativos...');
  const candidatos = [
    '/app/engine/models/database',
    '/app/engine/models/db',
    '/app/engine/db',
    '../engine/db',
  ];
  for (const c of candidatos) {
    try {
      db = require(c);
      console.log('✅ Carregado de:', c);
      break;
    } catch (_) {}
  }
  if (!db) {
    console.error('❌ Nenhum caminho funcionou. Abortando.');
    process.exit(1);
  }
}

const FORCE = process.argv.includes('--force');

async function main() {
  const jsonPath = path.join(__dirname, '..', 'bot_volumetrao.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Não encontrei bot_volumetrao.json em', jsonPath);
    process.exit(1);
  }
  const botConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const systemPrompt = botConfig.systemPrompt;
  const fallbackMessage = botConfig.fallbackMessage;

  if (!systemPrompt || !fallbackMessage) {
    console.error('❌ bot_volumetrao.json sem systemPrompt ou fallbackMessage');
    process.exit(1);
  }

  console.log('📋 Prompt global lido:');
  console.log('   systemPrompt   :', systemPrompt.length, 'chars');
  console.log('   fallbackMessage:', fallbackMessage.length, 'chars');
  console.log('   modo           :', FORCE ? 'FORCE (sobrescreve)' : 'safe (só config={})');
  console.log('');

  const { rows: companies } = await db.query(
    `SELECT id, name, config FROM companies ORDER BY id`
  );

  console.log(`🏢 ${companies.length} empresas encontradas\n`);

  let updated = 0;
  let skipped = 0;

  for (const c of companies) {
    const cfg = c.config || {};
    const alreadyHas = cfg.systemPrompt && String(cfg.systemPrompt).trim();

    if (alreadyHas && !FORCE) {
      console.log(`⏭  #${c.id} ${c.name} — já tem prompt (${cfg.systemPrompt.length} chars), pulando`);
      skipped++;
      continue;
    }

    const newConfig = {
      ...cfg,
      systemPrompt,
      fallbackMessage,
    };

    await db.query(
      `UPDATE companies SET config = $1::jsonb WHERE id = $2`,
      [JSON.stringify(newConfig), c.id]
    );

    console.log(`✅ #${c.id} ${c.name} — prompt gravado (${systemPrompt.length} chars)`);
    updated++;
  }

  console.log('');
  console.log(`🎉 Feito. Atualizadas: ${updated} | Puladas: ${skipped}`);
  console.log('ℹ️  Cache do geminiService é por processo — a API relê do banco em até 60s.');
  console.log('   (ou reinicie: docker compose restart api)');

  // Fecha pool, se existir
  try {
    if (db.pool && typeof db.pool.end === 'function') await db.pool.end();
    else if (typeof db.end === 'function') await db.end();
  } catch (_) { /* ignore */ }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  console.error(err.stack);
  process.exit(1);
});