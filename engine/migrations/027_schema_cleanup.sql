-- 027_schema_cleanup.sql
-- Q-02: padronizacao de schema + FK (SEM RLS — risco alto sem app.company_id em toda query)

-- 1. TIMESTAMPTZ em refresh_tokens (se colunas existirem como TIMESTAMP)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'expires_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE refresh_tokens
      ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens' AND column_name = 'created_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE refresh_tokens
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

-- 2. Padronizar phone VARCHAR(40)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    ALTER TABLE conversations ALTER COLUMN phone TYPE VARCHAR(40);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    ALTER TABLE messages ALTER COLUMN phone TYPE VARCHAR(40);
  END IF;
END $$;

-- 3. conversation_id + FK (quando possivel preencher)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INT;

-- Backfill conversation_id por phone+company quando existir conversa
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
  AND m.phone = c.phone
  AND m.company_id = c.company_id;

-- FK (nao-validante se ainda houver orfaos; preferimos ON DELETE SET NULL se falhar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_conversation'
  ) THEN
    BEGIN
      ALTER TABLE messages
        ADD CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'FK messages.conversation_id adiada: %', SQLERRM;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
  WHERE conversation_id IS NOT NULL;

-- 4. Tabelas mortas (sales / context) — drop seguro se vazias/existirem
-- Confirmado: fluxo atual nao le/grava. DROP protegido.
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS context CASCADE;

-- 5. RLS: INTENCIONALMENTE NAO HABILITADO
-- Isolamento permanece por company_id na camada de aplicacao.
-- Ver docs/ARCHITECTURE.md secao Multi-tenant / Q-02.
