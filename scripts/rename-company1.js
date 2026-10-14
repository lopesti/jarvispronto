const { query } = require('/app/engine/models/database');
query("UPDATE companies SET name = $1 WHERE id = $2", ["VendeMais Distribuidora", 1])
  .then(() => { console.log('OK - company 1 renomeada'); process.exit(0); })
  .catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
