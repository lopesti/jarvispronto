-- 017_fix_companies_seq.sql
-- Corrige o sequence de companies apos seeds que inserem ID explicito.
--
-- Contexto: a migration 014_multi_tenant.sql faz
--   INSERT INTO companies (id, name, slug) VALUES (1, 'Empresa Padrao', 'default')
--   ON CONFLICT (id) DO NOTHING;
--
-- Inserir com ID explicito NAO avanca o sequence companies_id_seq.
-- Resultado: em banco virgem, o proximo INSERT sem ID tenta usar 1 →
-- "duplicate key value violates unique constraint companies_pkey" (HTTP 500).
--
-- Fix: sincroniza o sequence com o maior ID existente. O terceiro parametro
-- 'true' faz nextval() retornar MAX(id) + 1 (proximo livre).

SELECT setval(
  'companies_id_seq',
  COALESCE((SELECT MAX(id) FROM companies), 1),
  true
);