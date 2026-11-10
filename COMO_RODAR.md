# Como rodar — JarvisPronto v1.5.1

## Pré-requisitos
- Docker + Docker Compose
- (Opcional) Node 20 para testes locais

## Passos

1. `cp .env.example .env`
2. Defina `JWT_SECRET` (mín. 16 chars) e `POSTGRES_PASSWORD` fortes.
3. `docker compose up -d --build`
4. Abra http://localhost e escaneie o QR em http://localhost/qr

## Modo fila (recomendado em produção)

No `.env`:
```
USE_MESSAGE_QUEUE=1
REDIS_URL=redis://redis:6379
```

Suba com worker:
```
docker compose --profile full up -d --build
```

Neste modo a **API não abre** o socket WhatsApp — o **worker** é o dono único da sessão. Reiniciar só a API não derruba o WA.

## Testes locais

```
npm install
npm test
```
