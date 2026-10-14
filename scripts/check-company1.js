const { query } = require('/app/engine/models/database');
query("SELECT id, name FROM companies WHERE id = 1")
  .then((r) => { console.log(r.rows); process.exit(0); })
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
