# Arquitetura JarvisPronto v1.5

## Diagrama C4 — Contexto

```mermaid
C4Context
    title JarvisPronto — Contexto do Sistema
    Person(cliente, "Cliente", "Conversa no WhatsApp / Instagram")
    Person(admin, "Operador", "Usa o dashboard")
    System(jarvis, "JarvisPronto", "Bot comercial + painel")
    System_Ext(wa, "WhatsApp", "Baileys multi-device")
    System_Ext(meta, "Meta Graph", "IG / Messenger")
    System_Ext(groq, "Groq / Gemini", "IA generativa")
    System_Ext(pg, "PostgreSQL", "Persistência")
    System_Ext(redis, "Redis", "Cache + fila")

    Rel(cliente, wa, "Mensagens")
    Rel(wa, jarvis, "messages.upsert")
    Rel(jarvis, groq, "generateResponse")
    Rel(jarvis, pg, "SQL")
    Rel(jarvis, redis, "cache / BullMQ")
    Rel(admin, jarvis, "HTTPS / JWT")
    Rel(jarvis, meta, "webhooks")
```

## Containers

```mermaid
C4Container
    title Containers
    Container(nginx, "Nginx", "1.27", "TLS + reverse proxy")
    Container(api, "API", "Node/Express", "HTTP + orquestração")
    Container(worker, "Worker", "Node/BullMQ", "Processa fila de msgs")
    Container(fe, "Frontend", "Next.js 15", "Dashboard")
    ContainerDb(pg, "PostgreSQL 16", "Dados")
    ContainerDb(redis, "Redis 7", "Cache + fila")
    Container(baileys, "Baileys", "Sessão WA", "auth_info volume")

    Rel(nginx, api, ":3000")
    Rel(nginx, fe, ":3001")
    Rel(api, pg, "pg")
    Rel(api, redis, "ioredis")
    Rel(api, baileys, "connect")
    Rel(worker, redis, "BullMQ")
    Rel(worker, pg, "repos")
    Rel(worker, baileys, "sendMessage")
```

## Fluxo de mensagem (com fila)

1. Cliente envia texto no WhatsApp  
2. Baileys `messages.upsert` → `whatsappService`  
3. Se `USE_MESSAGE_QUEUE=1` → `enqueueIncoming` (BullMQ)  
4. Worker consome job → `messageController` → repositórios → IA → `sock.sendMessage`  
5. Dashboard consulta `/api/conversations` com JWT  

## SimulationEngine

Quatro níveis de agentes em `engine/simulation/agents/`:

| Nível | Arquivo | Comportamento |
|-------|---------|---------------|
| 1 | AgentLevel1 | Respostas mínimas / quase reativas |
| 2 | AgentLevel2 | Contexto curto, pouco persuasivo |
| 3 | AgentLevel3 | Funil consciente, trata objeção |
| 4 | AgentLevel4 | Fechamento agressivo e contextual |

Usado via `/api/simulation` (JWT) para QA de prompts sem consumir sessão real.

## Segurança (v1.5)

- CORS allowlist estrita (`CORS_ORIGINS`)
- `/api/channels/status` exige JWT; webhooks Meta públicos
- Refresh token com `family_id` + detecção de reuso
- Portas 5432/6379 não expostas no host
- Senha default rejeitada no boot (produção)
- Rate limit + request-id + `/metrics`
