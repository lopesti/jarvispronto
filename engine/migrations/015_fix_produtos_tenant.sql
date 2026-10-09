-- Migration 015 — Correção de isolamento de produtos por tenant
-- 1. Backfill: produtos sem company_id vão para 'default' (empresa legada)
-- 2. NOT NULL: força futuros INSERTs a terem tenant
-- 3. Índice: performance em queries filtradas por tenant

UPDATE produtos
SET company_id = (SELECT id FROM companies WHERE slug = 'default' LIMIT 1)
WHERE company_id IS NULL;

ALTER TABLE produtos ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_company ON produtos(company_id);
