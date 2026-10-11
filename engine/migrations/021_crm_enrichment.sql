-- 021_crm_enrichment.sql
-- CRM: valor da oportunidade, origem, notas, tags extras, automações simples.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_source VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_human_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS probability INT DEFAULT 0;

COMMENT ON COLUMN conversations.deal_value IS 'Valor estimado da oportunidade';
COMMENT ON COLUMN conversations.lead_source IS 'Origem do lead (whatsapp, ads, indicacao...)';
COMMENT ON COLUMN conversations.probability IS 'Probabilidade 0-100 da etapa';

-- Notas internas do lead (timeline)
CREATE TABLE IF NOT EXISTS lead_notes (
    id           SERIAL PRIMARY KEY,
    company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone        VARCHAR(40) NOT NULL,
    user_id      INT REFERENCES users(id) ON DELETE SET NULL,
    body         TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_company_phone
  ON lead_notes(company_id, phone);

-- Automações simples de funil
CREATE TABLE IF NOT EXISTS automations (
    id           SERIAL PRIMARY KEY,
    company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    enabled      BOOLEAN NOT NULL DEFAULT true,
    trigger_type VARCHAR(40) NOT NULL,
    -- score_gte | days_in_step | step_enter | needs_human
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_type  VARCHAR(40) NOT NULL,
    -- notify | move_step | set_tag | handoff
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);

-- Seed de probabilidade padrão por etapa (usado no frontend/API)
-- Não cria tabela separada; documentado em features do plano.
