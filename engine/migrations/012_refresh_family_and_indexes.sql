-- P1 item 19 + 17: family_id para detecção de reuso + índices de performance

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS family_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON refresh_tokens (family_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_phone_created
  ON messages (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_step
  ON conversations (current_step);
