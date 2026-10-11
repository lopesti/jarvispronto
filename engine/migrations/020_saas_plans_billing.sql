-- 020_saas_plans_billing.sql
-- Base SaaS: planos, assinaturas, uso mensal e eventos de billing.

-- Planos disponíveis (seed abaixo)
CREATE TABLE IF NOT EXISTS plans (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(50) NOT NULL,
    price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly    DECIMAL(10,2),
    limits          JSONB NOT NULL DEFAULT '{}'::jsonb,
    features        JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assinatura por empresa
CREATE TABLE IF NOT EXISTS subscriptions (
    id                      SERIAL PRIMARY KEY,
    company_id              INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id                 INT NOT NULL REFERENCES plans(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'trial',
    -- trial | active | past_due | canceled | expired
    billing_cycle           VARCHAR(10) NOT NULL DEFAULT 'monthly',
    -- monthly | yearly
    trial_ends_at           TIMESTAMPTZ,
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
    external_id             VARCHAR(120),
    -- id no Asaas/Stripe
    external_customer_id    VARCHAR(120),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_company_active
    ON subscriptions(company_id)
    WHERE status IN ('trial', 'active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_external ON subscriptions(external_id);

-- Uso mensal (controle de limites)
CREATE TABLE IF NOT EXISTS usage_monthly (
    id                  SERIAL PRIMARY KEY,
    company_id          INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year_month          CHAR(7) NOT NULL,
    -- '2026-10'
    conversations       INT NOT NULL DEFAULT 0,
    messages_sent       INT NOT NULL DEFAULT 0,
    messages_received   INT NOT NULL DEFAULT 0,
    users_count         INT NOT NULL DEFAULT 0,
    whatsapp_numbers    INT NOT NULL DEFAULT 0,
    produtos_count      INT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_usage_monthly_company ON usage_monthly(company_id);

-- Eventos de billing (auditoria)
CREATE TABLE IF NOT EXISTS billing_events (
    id          SERIAL PRIMARY KEY,
    company_id  INT REFERENCES companies(id) ON DELETE SET NULL,
    type        VARCHAR(60) NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company ON billing_events(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(type);

-- Cache rápido do plano na empresa
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS plan_code VARCHAR(30) DEFAULT 'trial';

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';

-- Seed dos planos (alinhado com Landing + /planos)
INSERT INTO plans (code, name, price_monthly, price_yearly, limits, features, sort_order)
VALUES
(
    'trial',
    'Trial',
    0,
    0,
    '{"conversations": 300, "users": 1, "whatsapp_numbers": 1, "produtos": 10, "history_days": 30}'::jsonb,
    '{"automations": false, "webhooks": false, "multi_company": 0, "custom_prompt": true, "support": "community"}'::jsonb,
    0
),
(
    'prata',
    'Prata',
    99.00,
    990.00,
    '{"conversations": 2000, "users": 3, "whatsapp_numbers": 1, "produtos": 50, "history_days": 90}'::jsonb,
    '{"automations": "basic", "webhooks": false, "multi_company": 0, "custom_prompt": true, "support": "email"}'::jsonb,
    1
),
(
    'gold',
    'Gold',
    299.00,
    2990.00,
    '{"conversations": 8000, "users": 10, "whatsapp_numbers": 3, "produtos": 200, "history_days": 365}'::jsonb,
    '{"automations": "full", "webhooks": true, "multi_company": 3, "custom_prompt": true, "support": "priority"}'::jsonb,
    2
),
(
    'diamante',
    'Diamante',
    999.00,
    9990.00,
    '{"conversations": 50000, "users": 30, "whatsapp_numbers": 10, "produtos": -1, "history_days": 730}'::jsonb,
    '{"automations": "full", "webhooks": true, "multi_company": -1, "custom_prompt": true, "support": "whatsapp", "white_label": true}'::jsonb,
    3
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    active = true;

-- Garante assinatura trial para empresas existentes sem subscription
INSERT INTO subscriptions (company_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
SELECT
    c.id,
    p.id,
    'trial',
    'monthly',
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
FROM companies c
CROSS JOIN plans p
WHERE p.code = 'trial'
  AND NOT EXISTS (
      SELECT 1 FROM subscriptions s WHERE s.company_id = c.id
  );

UPDATE companies c
SET
    plan_code = 'trial',
    subscription_status = 'trial'
WHERE c.plan_code IS NULL OR c.plan_code = 'trial';
