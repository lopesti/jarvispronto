const bcrypt = require('bcrypt');
const { query } = require('/app/engine/models/database');

(async () => {
  const hash = await bcrypt.hash('VendeMais2026!', 12);
  const existing = await query("SELECT id FROM users WHERE email = $1", ['dono@vendemais.com']);
  if (existing.rows.length > 0) {
    await query("UPDATE users SET password = $1, company_id = 1, role = 'owner' WHERE email = $2", [hash, 'dono@vendemais.com']);
    console.log('Usuario atualizado');
  } else {
    await query("INSERT INTO users (name, email, password, role, company_id, created_at) VALUES ($1, $2, $3, 'owner', 1, NOW())",
      ['Dono VendeMais', 'dono@vendemais.com', hash]);
    console.log('Usuario criado');
  }
  process.exit(0);
})();
