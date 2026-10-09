-- 003_create_conversations.sql
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(30) UNIQUE NOT NULL,
    context JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    lead_score INTEGER DEFAULT 0,
    current_step VARCHAR(50) DEFAULT 'inicio',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
