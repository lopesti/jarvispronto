# JARVIS Comercial 1.3.0

## Novidades desta versao

- Tema **Dia / Noite** (toggle no menu)
- Landing publica de produto (`/`)
- **Kanban / Pipeline** com leads reais e mudanca de etapa
- Funil automatico no WhatsApp (current_step + lead_score)
- Base **multi-canal** (`channel` nas conversas)
- Esboco **Meta** (Instagram + Facebook): `/api/channels/meta/webhook`
- Tela **Canais** no painel
- Cor primaria **verde comercial** (menos "template ciano")

## Subir

```powershell
copy .env.example .env
# edite JWT_SECRET, GROQ_API_KEY, GEMINI_API_KEY

docker compose up -d --build
docker compose logs -f api
```

URLs:
- http://localhost:3000/health
- http://localhost:3000/qr
- http://localhost:3001 (landing)
- http://localhost:3001/login

## Meta (opcional)

No .env:
```
META_VERIFY_TOKEN=seu_token
META_PAGE_ACCESS_TOKEN=seu_token_pagina
```

Webhook: `https://SEU_DOMINIO/api/channels/meta/webhook`

## Se o frontend falhar no build Docker (Windows)

```powershell
docker builder prune -f
docker compose build --no-cache frontend
docker compose up -d
```
