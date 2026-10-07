-- 019_superadmin.sql
-- Adiciona flag is_superadmin em users.
-- Superadmin acessa rotas /api/admin/*.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Promove ze@teste.com a superadmin.
UPDATE users SET is_superadmin = true WHERE email = 'ze@teste.com';

-- Indice parcial (poucos superadmins).
CREATE INDEX IF NOT EXISTS idx_users_superadmin ON users(is_superadmin) WHERE is_superadmin = true;