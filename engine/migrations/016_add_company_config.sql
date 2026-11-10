-- Migration 016 — BUG-009
-- Adiciona coluna config JSONB em companies (prompt por tenant).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;