-- 006_create_context.sql
-- Mantida por compatibilidade; contexto principal fica em conversations.context
CREATE TABLE IF NOT EXISTS context (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(30) UNIQUE NOT NULL,
    context JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_phone ON context(phone);
