-- 022_lead_tasks.sql
-- Tarefas de follow-up por lead / empresa

CREATE TABLE IF NOT EXISTS lead_tasks (
    id           SERIAL PRIMARY KEY,
    company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone        VARCHAR(40) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    due_at       TIMESTAMPTZ,
    status       VARCHAR(20) NOT NULL DEFAULT 'open',
    -- open | done | canceled
    priority     VARCHAR(10) NOT NULL DEFAULT 'medium',
    -- low | medium | high
    assigned_to  INT REFERENCES users(id) ON DELETE SET NULL,
    created_by   INT REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_company_status
  ON lead_tasks(company_id, status);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_due
  ON lead_tasks(company_id, due_at)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_lead_tasks_phone
  ON lead_tasks(company_id, phone);
