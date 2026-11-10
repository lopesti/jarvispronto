-- F-13: alinha features prometidas com o que existe de fato
UPDATE plans SET features = '{"automations": false, "webhooks": false, "multi_company": false, "custom_prompt": true, "support": "community", "history_days": 7}'::jsonb
WHERE code = 'trial';

UPDATE plans SET features = '{"automations": true, "webhooks": false, "multi_company": false, "custom_prompt": true, "support": "email", "history_days": 30}'::jsonb
WHERE code = 'prata';

UPDATE plans SET features = '{"automations": true, "webhooks": false, "multi_company": false, "custom_prompt": true, "support": "priority", "history_days": 90}'::jsonb
WHERE code = 'gold';

UPDATE plans SET features = '{"automations": true, "webhooks": false, "multi_company": false, "custom_prompt": true, "support": "whatsapp", "history_days": 365, "white_label": false}'::jsonb
WHERE code = 'diamante';
