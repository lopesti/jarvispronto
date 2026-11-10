-- 027_create_agents.sql — Agent Builder (TCC)
-- 1 agente por produto

CREATE TABLE IF NOT EXISTS agents (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    produto_id      INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    avatar_url      VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'draft',
    template_key    VARCHAR(50) DEFAULT 'custom',
    system_prompt   TEXT,
    welcome_message TEXT,
    temperature     DECIMAL(3,2) DEFAULT 0.7,
    model           VARCHAR(50) DEFAULT 'gemini',
    version         INTEGER DEFAULT 1,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, produto_id)
);

CREATE TABLE IF NOT EXISTS agent_versions (
    id              SERIAL PRIMARY KEY,
    agent_id        INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    system_prompt   TEXT,
    welcome_message TEXT,
    tools_snapshot  JSONB DEFAULT '[]',
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_tools (
    id              SERIAL PRIMARY KEY,
    agent_id        INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_key        VARCHAR(50) NOT NULL,
    enabled         BOOLEAN DEFAULT true,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, tool_key)
);

CREATE TABLE IF NOT EXISTS agent_channels (
    id              SERIAL PRIMARY KEY,
    agent_id        INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    channel         VARCHAR(30) NOT NULL,
    enabled         BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, channel)
);

CREATE TABLE IF NOT EXISTS agent_metrics (
    id              SERIAL PRIMARY KEY,
    agent_id        INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    conversations   INTEGER DEFAULT 0,
    resolved        INTEGER DEFAULT 0,
    handed_to_human INTEGER DEFAULT 0,
    messages_in     INTEGER DEFAULT 0,
    messages_out    INTEGER DEFAULT 0,
    UNIQUE(agent_id, date)
);

CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_produto ON agents(produto_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
