-- 023: notificações do painel + controle de lembrete de tarefa atrasada

CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(60) NOT NULL,
    title        VARCHAR(200) NOT NULL,
    body         TEXT,
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_company_unread
  ON notifications(company_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE lead_tasks
  ADD COLUMN IF NOT EXISTS last_overdue_notified_at TIMESTAMPTZ;
