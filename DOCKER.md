# Docker — JarvisPronto v1.5.1

## Serviços

| Serviço | Porta interna | Host |
|---------|---------------|------|
| nginx | 80, 443 | 80, 443 |
| api | 3000 | (não exposta) |
| frontend | 3001 | (não exposta) |
| postgres | 5432 | **não mapeada** (só rede interna) |
| redis | 6379 | **não mapeada** (só rede interna) |
| worker | — | profile `full` |

Redis sobe **sempre** (cache + fila). O worker só sobe com `--profile full`.

## Build

```bash
docker compose build
docker compose up -d
docker compose --profile full up -d   # inclui worker
```

## Health

- API: `GET /health`
- Postgres: healthcheck `pg_isready`
