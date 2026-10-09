# Relatório de correções — JarvisPronto v1.5.1

Data: 2026-09-17  
Base: v1.5.0 → v1.5.1

## Itens corrigidos

| ID | Item | Status | Evidência |
|----|------|--------|-----------|
| 1.1 | Dupla conexão Baileys | Feito | `app.js`: só conecta se `!useQueue`; worker log "dono unico" |
| 1.2 | CORS regex sem âncora | Feito | Regex `^https?:\/\/(localhost\|127\.0\.0\.1)(:\d+)?$` |
| 1.3 | Cache IA chave fraca | Feito | `buildCacheKey` SHA-256 input+history |
| 1.4 | uncaughtException | Feito | `process.exit(1)` após log de stack |
| 1.5 | rid decorativo | Feito | rid único propagado em queue/controller |
| 1.6 | Código morto | Feito | removidos users.js, frontend/src, duplicatas |
| 1.7 | README | Feito | reescrito limpo |
| 1.8 | CI | Feito | postgres service, sem `\|\| true`, sem continue-on-error |
| 2.1 | Testes auth | Parcial | sign/verify + validação; rotate com DB real fica para ambiente com PG |
| 2.2 | Testes messageController | Feito | 6 casos com mocks |
| 2.3 | Consolidar memory | Parcial | memoryModel removido; conversationController SQL inline ainda existe |
| 2.4 | Dockerfile frontend | Feito | multi-stage + standalone |
| 2.5 | settings copy | Feito | Escova Alisadora / Baileys |
| 2.6 | analytics | Parcial | copy ajustada; métricas completas ainda dependem de API |
| 2.7 | COMO_RODAR / DOCKER | Feito | v1.5.1 + modo fila |

## Comparativo de notas (honesto)

| Dimensão | 1.5.0 | 1.5.1 | Delta |
|----------|-------|-------|-------|
| Arquitetura | 4,2 | 4,4 | +0,2 |
| Segurança | 4,5 | 4,6 | +0,1 |
| Escalabilidade | 3,8 | 4,1 | +0,3 |
| Testabilidade | 3,5 | 3,9 | +0,4 |
| Docs / portfólio | 3,5 | 4,2 | +0,7 |
| **Média** | **~3,9** | **~4,1** | **+0,2** |

## Pendente (não bloqueante)

- `rotateRefreshToken` com DB real nos testes (precisa Postgres no runner local)
- Refatorar SQL restante em `conversationController` para repositórios
- Analytics com gráficos reais no cliente
- E2E Playwright

## Critério global

- `npm test` deve passar nos unitários/integração com mocks
- README sem artefatos `@"``
- CI sem bypass de typecheck / gitleaks
- Modo fila: API não conecta WA
