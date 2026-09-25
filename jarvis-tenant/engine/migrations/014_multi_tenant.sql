-- Multi-tenant: empresas isoladas + WhatsApp por empresa
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);

DO $$ BEGIN
  BEGIN
    ALTER TABLE produtos ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- Remove UNIQUE so phone so (company_id, phone) pode repetir entre empresas
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_phone_key;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_phone_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_company_phone_unique'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_company_phone_unique UNIQUE (company_id, phone);
  END IF;
END $$;

INSERT INTO companies (id, name, slug)
VALUES (1, 'Empresa Padrao', 'default')
ON CONFLICT (id) DO NOTHING;

-- se id 1 ja existir por serial, garante linha default
INSERT INTO companies (name, slug)
SELECT 'Empresa Padrao', 'default'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE slug = 'default');

UPDATE users SET company_id = (SELECT id FROM companies WHERE slug = 'default' LIMIT 1) WHERE company_id IS NULL;
UPDATE conversations SET company_id = (SELECT id FROM companies WHERE slug = 'default' LIMIT 1) WHERE company_id IS NULL;
UPDATE messages SET company_id = (SELECT id FROM companies WHERE slug = 'default' LIMIT 1) WHERE company_id IS NULL;
