# Docker — JARVIS Pronto

## Serviços

| Serviço    | Porta | Descrição              |
|------------|-------|------------------------|
| **api**    | 3000  | Backend Express + bot  |
| **postgres** | 5432 | Banco PostgreSQL 16  |
| **redis**  | 6379  | Cache (opcional)       |

## Como subir

```bash
# 1. Na raiz do repositório jarvispronto
cp .env.example .env
# Edite .env e coloque GROQ_API_KEY, GEMINI_API_KEY, JWT_SECRET

# 2. Copie estes arquivos para a raiz do projeto (se ainda não estiverem):
#    Dockerfile, docker-compose.yml, .dockerignore, .env.example

# 3. Build + start
docker compose up -d --build

# 4. Ver logs (QR Code do WhatsApp aparece aqui)
docker compose logs -f api
```

## Comandos úteis

```bash
# Status
docker compose ps

# Logs só da API
docker compose logs -f api

# Parar
docker compose down

# Parar e apagar volumes (CUIDADO: apaga sessão WhatsApp e banco)
docker compose down -v

# Rebuild após mudar código
docker compose up -d --build api

# Entrar no container
docker compose exec api sh

# Redis (perfil full)
docker compose --profile full up -d
```

## Sessão WhatsApp

A pasta de autenticação do Baileys fica no volume `jarvis_auth`.  
Assim o QR Code não precisa ser escaneado de novo a cada `docker compose up`.

## Healthcheck

A API expõe `GET /health`. O Docker usa isso para saber se o container está saudável.

Se a rota no seu `app.js` tiver outro path, ajuste o `HEALTHCHECK` no Dockerfile.

## Produção

1. Troque `jarvis_secret` por senhas fortes no `.env` e no `docker-compose.yml`
2. Não exponha a porta 5432 publicamente em produção
3. Use reverse proxy (Nginx / Caddy) na frente da porta 3000
4. Faça backup do volume `jarvis_pgdata` e `jarvis_auth`

## Frontend Next.js (depois)

No futuro o `docker-compose` pode ganhar um serviço `frontend`:

```yaml
frontend:
  build: ./frontend
  ports:
    - "3001:3000"
  environment:
    NEXT_PUBLIC_API_URL: http://api:3000
  depends_on:
    - api
```
