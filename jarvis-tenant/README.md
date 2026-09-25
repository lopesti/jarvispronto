# JarvisPronto

**Assistente comercial WhatsApp + IA + Dashboard** — vende Escova Alisadora 3 em 1 com funil, lead score e painel Next.js.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](.github/workflows/ci.yml)
[![Node](https://img.shields.io/badge/Node-20-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](./docker-compose.yml)
[![License](https://img.shields.io/badge/License-ISC-lightgrey)](./package.json)

## Sobre

JarvisPronto é um bot de vendas no WhatsApp (Baileys) com respostas geradas por IA (Groq / Gemini com fallback), persistência em PostgreSQL, cache/fila em Redis e um dashboard em Next.js 15 para operadores.

A arquitetura é um monólito modular: a API Express pode processar mensagens inline ou enfileirá-las (BullMQ) para um worker separado — nesse modo, reiniciar a API não derruba a sessão WhatsApp.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Runtime | Node.js 20 |
| API | Express 5 |
| WhatsApp | Baileys 7 |
| IA | Groq (Llama 3.3) + Google Gemini |
| Banco | PostgreSQL 16 |
| Cache / Fila | Redis 7 + BullMQ |
| Frontend | Next.js 15, TypeScript, Tailwind, Zustand |
| Proxy | Nginx 1.27 |
| Deploy | Docker Compose |

## Arquitetura

Ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (diagramas C4 + fluxo de mensagem).

## Como rodar

```bash
cp .env.example .env
# Edite JWT_SECRET e POSTGRES_PASSWORD (obrigatórios e fortes)

docker compose up -d --build
# API: http://localhost (via Nginx)
# QR:  http://localhost/qr
```

Modo fila (worker dono do socket WA):

```bash
# no .env
USE_MESSAGE_QUEUE=1

docker compose --profile full up -d --build
```

## Variáveis de ambiente

Ver [`.env.example`](./.env.example). Obrigatórios em produção: `JWT_SECRET`, `DATABASE_URL` / `POSTGRES_PASSWORD`.

## Estrutura

```
engine/          # API, services, WA, IA, workers, migrations
frontend/        # Dashboard Next.js
nginx/           # Reverse proxy + TLS
scripts/         # Backup, SSL, utilitários
tests/           # Jest unitários
docs/            # Arquitetura e relatórios
```

## Testes

```bash
npm install
npm test
```

## Roadmap

**Feito (1.5.x):** segurança de borda, fila/worker, cache Redis, repositórios, CI, testes de funil/auth, docs C4.

**Pendente:** multi-produto no banco, mídia (áudio/imagem), Meta unificado, E2E Playwright, feature flags, endpoint LGPD.

## Licença

ISC

## Multi-tenant (v1.6)

Cada registro cria uma empresa. WhatsApp e conversas sao isolados por empresa.
Veja docs/MULTI_TENANT.md

