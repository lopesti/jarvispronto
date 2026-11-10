# Changelog

## [1.16.0] - 2026-10-12

### Bloco 2
- S-04 cookies httpOnly, sessionStorage, QR off prod
- S-06 metrics token, timingSafeEqual, internal off prod
- F-09 handoff sem "pessoa", lock, handoff.triggered, retorno ao bot (cron 30min)
- F-11 params IA
- O-04 pino + requestId
- O-05 polling 30-60s
- O-06 limit default 100
- L-01 privacidade suboperadores, group monitor opt-in
- T-01 testes unitarios (handoff, token, refresh shape, acento)

### Bloco 3
- F-07: checkLimit produtos, enqueue fila, runAutomations + usage em handleMessage
- F-13: migration 026 features honestas + UI planos
- O-08: docs/ARCHITECTURE.md decisao Baileys vs Cloud API
- Q-02: backlog documentado

### Bloco 4
- S-09 helmet + lockout login + erros genericos
- S-10 AUTH_CHECK_DB opcional
- F-08 pipeline sem auto-move por score cliente
- F-10 so notify + delay humano
- F-12 simulation route off
- F-15 sendMessage 503 se WA offline
- O-07 CI basico + audit
- O-09 scripts/restore-pg.sh
- O-10 Dockerfile multi-stage USER node


## [1.15.2] - 2026-10-12

### Security / ops (pré-TCC)
- **O-04**: logger pino JSON + requestId middleware (`X-Request-Id`)
- **L-01**: política de privacidade com suboperadores (Groq, Gemini, Asaas, Supabase); group monitor opt-in (`ENABLE_GROUP_MONITOR`)
- **F-09**: lock por phone ignora concorrência (TTL 30s) + evento `handoff.triggered`
- **S-04**: SameSite=Strict nos cookies de auth
- **O-05**: polling ainda mais calmo (sidebar ~60s)
- Worker expõe `/metrics` autenticado


## [1.15.1] - 2026-10-12

### Security
- **S-04**: tokens preferem cookies httpOnly + sessionStorage; QR não é impresso em produção
- **S-06**: `/metrics` exige METRICS_TOKEN (timingSafeEqual); `/internal` off em produção por padrão; worker/internal com timingSafeEqual

### Fixed
- **F-09**: removido "pessoa" do regex de handoff; lock por telefone evita respostas concorrentes
- **F-11**: max_tokens 500, temperature 0.4, modelo Gemini estável
- **O-05**: polling do frontend menos agressivo (15–20s)
- **O-06**: listagem de conversas com limit default 100 (max 200)



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
