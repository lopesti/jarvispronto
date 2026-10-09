-- 008_multi_channel.sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT 'whatsapp';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_id VARCHAR(120);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS display_name VARCHAR(120);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_step ON conversations(current_step);

-- unique por canal + telefone/external quando possivel
DO $$ BEGIN
  -- external_id index for meta ids
  CREATE INDEX IF NOT EXISTS idx_conversations_external ON conversations(channel, external_id);
EXCEPTION WHEN others THEN NULL;
END $$;
