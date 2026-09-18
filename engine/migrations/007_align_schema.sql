-- 007_align_schema.sql
-- Ajusta schema antigo para o novo formato (idempotente)

-- conversations: adiciona colunas se faltarem
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    BEGIN
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '[]'::jsonb;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_step VARCHAR(50) DEFAULT 'inicio';
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- messages: adiciona role/content se faltarem
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    BEGIN
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT;
    EXCEPTION WHEN others THEN NULL;
    END;
    -- copia message -> content se content vazio
    BEGIN
      UPDATE messages SET content = message WHERE content IS NULL AND message IS NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;
