# Changelog

## [1.5.1] — 2026-09-17

### Correções críticas (Fase 1)
- **Baileys dupla conexão:** em `USE_MESSAGE_QUEUE=1` a API não abre socket; worker é o dono único
- **CORS:** regex de localhost ancorada (`^https?://(localhost|127.0.0.1)(:\d+)?$`)
- **Cache IA:** chave com hash SHA-256 do input + histórico completo
- **uncaughtException:** processo encerra com `process.exit(1)`
- **rid:** um id por mensagem, propagado em queue e controller
- **Código morto removido:** `users.js`, `frontend/src/`, `next.config.js` duplicado, `types/index.ts`, duplicatas de scripts na raiz
- **README** reescrito (sem artefatos de shell)
- **CI:** Postgres service, typecheck sem `|| true`, gitleaks sem `continue-on-error`, job lint

### Qualidade (Fase 2)
- Testes de `messageController` com mocks (6 casos)
- Testes de cache key e JWT sign/verify
- Dockerfile frontend multi-stage (`output: 'standalone'`)
- Settings/copy: Escova Alisadora + Baileys
- COMO_RODAR / DOCKER atualizados para 1.5.1 e modo fila

## [1.5.0] — 2026-09-17
Ver relatório anterior (P0/P1 checklist).

## [1.6.0] — 2026-09-18

### UX / produto (inspiração SaleSmartly, escopo TCC)
- **Inbox:** empty state, filtros (Todas / Precisa humano / Minhas), badges de step, score e canal
- **Handoff:** endpoints `POST /handoff`, `/claim`, `/release`, `PATCH /bot-mode`
- **Bot modes:** `full` | `hybrid` | `human` + auto-handoff por keyword ou score ≥ 70
- **Canais:** status real do WhatsApp (connected / QR / disconnected) + cards TCC vs roadmap
- **Sidebar:** indicador de canal, badge de handoffs pendentes, nav enxuta
- **Overview:** card "precisa humano" + CTA conectar canal
- **Migration 013:** `needs_human`, `assigned_to`, `handoff_summary`, `bot_mode`
