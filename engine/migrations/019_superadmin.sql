-- 019_superadmin.sql
-- Adiciona flag is_superadmin em users.
-- Superadmin acessa rotas /api/admin/*.
--
-- S-08 (corrigido): a promocao do superadmin nao e mais hardcoded na migration.
-- Agora ela e feita no boot da API, lendo SUPERADMIN_EMAIL do .env.
-- Ver: engine/services/superadminService.js (promoteFromEnv)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Indice parcial (poucos superadmins).
CREATE INDEX IF NOT EXISTS idx_users_superadmin ON users(is_superadmin) WHERE is_superadmin = true;