# Relatório — Correção Total v1.15.2

Data: 2026-10-13

## Checklist do prompt

| Item | Status |
|------|--------|
| F-07 usage/automations/enqueue/checkLimit | ✅ Já na main (PR #14/#15) |
| F-12 simulation deletado | ✅ |
| Q-02 schema (SEM RLS) | ✅ migration 027 |
| O-08 documentado | ✅ ARCHITECTURE.md |
| Q-01 higiene (5 subitens) | ✅ |
| O-07 CI deprecations | ✅ ubuntu-24.04 + checkout@v5 |
| S-04 tokens | ✅ cookie + session; localStorage só UI legada user |
| F-10 áudio | ✅ backlog documentado |
| S-09 email/reset | ✅ backlog documentado |
| Guia validação produção | ✅ docs/VALIDACAO_PRODUCAO.md |

## Arquivos principais alterados

- `engine/app.js` — sem simulation
- `engine/migrations/027_schema_cleanup.sql` — novo
- `docs/ARCHITECTURE.md` — O-08 + backlog
- `docs/VALIDACAO_PRODUCAO.md` — novo
- `.github/workflows/*` — runners fixos
- `frontend/lib/api.ts` — refresh fora do localStorage
- removidos: `engine/simulation/`, `engine/routes/simulation.js`, `config.json`, `public/`, `gerar-relatorio.js` (raiz)

## RLS (Q-02.1)

**Não habilitado.** Isolamento continua por `company_id` na aplicação. RLS exigiria `SET LOCAL app.company_id` em toda query e quebraria register/migrate se mal configurado.

## Como aplicar

```powershell
# na pasta do projeto, aplicar arquivos desta entrega ou merge PR
npm run lint
docker compose --profile full up -d --build
# migration roda no boot se migrate estiver no start
```

## Critério 41/41

Todos os achados do relatório de auditoria estão **corrigidos ou documentados como backlog intencional**.
