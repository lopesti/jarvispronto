-- 025_backfill_trial_subscriptions.sql
-- F-05: garante que toda empresa sem assinatura ganhe trial.
-- Cobre empresas criadas entre a migration 020 e agora (ex: testes locais).

INSERT INTO subscriptions (
    company_id, plan_id, status, billing_cycle,
    trial_ends_at, current_period_start, current_period_end
)
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

-- Alinha o cache rapido
UPDATE companies c
SET
    plan_code = COALESCE(c.plan_code, 'trial'),
    subscription_status = COALESCE(c.subscription_status, 'trial')
WHERE c.plan_code IS NULL
   OR c.subscription_status IS NULL;