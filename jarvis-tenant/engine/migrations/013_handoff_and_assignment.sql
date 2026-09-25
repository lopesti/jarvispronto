-- Handoff humano + atribuição (multiusuário leve) + modo do bot
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS needs_human BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_summary TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_mode VARCHAR(20) DEFAULT 'full';
-- bot_mode: full | hybrid | human

CREATE INDEX IF NOT EXISTS idx_conversations_needs_human ON conversations(needs_human) WHERE needs_human = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
