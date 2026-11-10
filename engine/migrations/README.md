# Migrations JarvisPronto

Executadas automaticamente no boot via `engine/models/migrate.js` (tabela `schema_migrations`).

| Arquivo | Descrição |
|---------|-----------|
| 001_create_users.sql | Tabela users |
| 002_create_produtos.sql | Catálogo de produtos |
| 003_create_conversations.sql | Conversas / leads |
| 004_create_messages.sql | Histórico de mensagens |
| 005_create_sales.sql | Vendas |
| 006_create_context.sql | Contexto extra |
| 007_align_schema.sql | Alinhamento de schema |
| 008_multi_channel.sql | Suporte multi-canal |
| 010_seed_produtos.sql | Seed de produtos |
| 011_auth_refresh_tokens.sql | Refresh tokens |
| 012_refresh_family_and_indexes.sql | family_id (reuso) + índices (phone, created_at) |

## Regras

- Idempotentes: rodar duas vezes não deve quebrar.
- Novas migrations: próximo número sequencial + `IF NOT EXISTS` quando possível.
- Não editar migrations já aplicadas em produção; criar nova.

## Rodar manualmente

```bash
npm run migrate
```
