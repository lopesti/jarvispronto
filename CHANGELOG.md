# Changelog

Todas as mudanças relevantes do JarvisPronto.

## [1.15.0] — 2026-10-13

### Correções críticas pré-TCC (PR #4)
- **F-01** — refresh token devolvido como string (era objeto; front gravava `[object Object]` e a sessão caía a cada 15min)
- **F-02** — cache IA não cacheia mensagens curtas/ambíguas (`sim`, `quanto`, `pode`); evita lead A receber resposta do lead B
- **F-04** — funil normaliza acentos com NFD (`não`, `preço`, `cartão` agora casam)
- **S-01** — webhook Asaas exige `ASAAS_WEBHOOK_TOKEN` em produção + `timingSafeEqual`
- **S-02** — `subscribe` bloqueia modo local em produção + restringe a role `owner`
- **S-03** — `SUBSCRIPTION_CREATED` removido de `paidEvents`

### Bloco 1 — Correções críticas (PRs #5 a #11)
- **S-07** — n8n removido completamente do projeto (credenciais expostas)
- **S-08** — migration 019 sem email fixo; promoção a superadmin via `SUPERADMIN_EMAIL` no boot
- **S-05** — `PUT /companies/:id/config` restrito a owner + allowlist de chaves + limites de tamanho
- **F-03** — catálogo de produtos injetado no prompt da IA (`buildProductsContext`)
- **F-05** — empresa nova nasce com trial de 14 dias (migration 025 + `createTrialSubscription`)
- **F-06** — `getHistory` roda antes do insert; sem duplicação no prompt
- **D-01** — versão da API alinhada em 1.15.0 (`/health` e `package.json`)
- **O-01** — volume nomeado `jarvis_data` em `/app/data` (blacklist e insights persistem)
- **O-03** — shutdown gracioso: `SIGTERM`, `uncaughtException`, `unhandledRejection`
- **Q-01** — 6 deps mortas removidas do frontend (zod, react-hook-form, @hookform/resolvers, recharts, date-fns, class-variance-authority)
- **L-01** — telefones reais removidos do repo; whitelist via arquivo local
- **DB** — `connectionTimeoutMillis` 5s → 15s (cold connection no Docker Windows)
- **Dual mode** — online (Supabase, padrão) + local (Postgres Docker, opt-in via `docker-compose.local.yml`)

### Bloco 2 — Observabilidade, handoff, testes e hardening (PR #14)
- **O-04** — logger JSON estruturado (pino) + `requestId` middleware montado
- **S-04** — tokens preferem cookies httpOnly + sessionStorage; QR não é impresso em produção
- **S-06** — `/metrics` exige `METRICS_TOKEN` (timingSafeEqual); `/internal` off em produção
- **S-09** — helmet + lockout de login + erros genéricos
- **S-10** — `AUTH_CHECK_DB` opcional
- **F-08** — pipeline sem auto-move por score do cliente
- **F-09** — `handoffReturnService` + lock por telefone + evento `handoff.triggered` (cron 30min)
- **F-10** — só notify + delay humano
- **F-11** — `max_tokens` 500, `temperature` 0.4, modelo Gemini estável
- **F-12** — rota de simulação desativada em produção
- **F-13** — migration 026 (features honestas) + UI de planos alinhada
- **F-15** — `sendMessage` retorna 503 se WhatsApp offline
- **O-05** — polling do frontend menos agressivo (30–60s)
- **O-06** — listagem de conversas com `limit` default 100 (max 200)
- **O-09** — `scripts/restore-pg.sh` documentado
- **O-10** — Dockerfile multi-stage + `USER node`
- **T-01** — 4 testes standalone: `handoffKeywords`, `webhook-token`, `refresh-shape`, `funnel-acento`
- **CI** — `ci.yml` completo (lint + test + docker build + secrets scan) + `smoke.yml` com `INTERNAL_SIM_TOKEN`

### Backlog documentado (Bloco 3)
- **F-07** — parcial: `checkLimit` produtos, `enqueue` fila, `runAutomations` + usage em `handleMessage`
- **O-08** — decisão Baileys vs WhatsApp Cloud API documentada em `docs/ARCHITECTURE.md`
- **Q-02** — RLS e tipos de banco no backlog

## [1.6.0] — 2026-09-18

### UX / produto
- **Inbox:** empty state, filtros (Todas / Precisa humano / Minhas), badges de step, score e canal
- **Handoff:** endpoints `POST /handoff`, `/claim`, `/release`, `PATCH /bot-mode`
- **Bot modes:** `full` | `hybrid` | `human` + auto-handoff por keyword ou score ≥ 70
- **Canais:** status real do WhatsApp (connected / QR / disconnected)
- **Sidebar:** indicador de canal, badge de handoffs pendentes
- **Overview:** card "precisa humano" + CTA conectar canal
- **Migration 013:** `needs_human`, `assigned_to`, `handoff_summary`, `bot_mode`

## [1.5.1] — 2026-09-17

### Correções críticas
- **Baileys dupla conexão:** em `USE_MESSAGE_QUEUE=1` a API não abre socket; worker é o dono único
- **CORS:** regex de localhost ancorada (`^https?://(localhost|127.0.0.1)(:\d+)?$`)
- **Cache IA:** chave com hash SHA-256 do input + histórico completo
- **uncaughtException:** processo encerra com `process.exit(1)`
- **rid:** um id por mensagem, propagado em queue e controller
- **Código morto removido:** `users.js`, `frontend/src/`, `next.config.js` duplicado, `types/index.ts`
- **README** reescrito
- **CI:** Postgres service, typecheck sem `|| true`, gitleaks sem `continue-on-error`, job lint

### Qualidade
- Testes de `messageController` com mocks (6 casos)
- Testes de cache key e JWT sign/verify
- Dockerfile frontend multi-stage (`output: 'standalone'`)
- COMO_RODAR / DOCKER atualizados para 1.5.1

## [1.5.0] — 2026-09-17

- Ver relatório anterior (P0/P1 checklist)