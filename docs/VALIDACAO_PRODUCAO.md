# Guia de validação em produção — JarvisPronto

Checklist operacional pós-deploy. Não substitui smoke local.

## 1. Stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile full up -d --build
docker compose ps
curl -fsS https://SEU_DOMINIO/health
```

**Critério:** containers healthy; `/health` 200.

## 2. Auth

- Register + login
- Refresh (cookie httpOnly + fallback session)
- Logout revoga refresh

## 3. Asaas (sandbox)

1. Configurar `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` de sandbox
2. Criar assinatura via `POST /api/billing/subscribe`
3. Simular webhook pago no painel Asaas
4. Confirmar `subscriptions.status = active` e uso liberado

## 4. WhatsApp (Baileys)

1. `POST /api/whatsapp/connect` → QR
2. Escanear com número de **teste**
3. Enviar mensagem de texto → resposta da IA
4. Desconectar cabo/sessão → alerta de desconexão (se push ativo)

## 5. Backup / restore

```bash
./scripts/backup-pg.sh
# em cópia de banco:
./scripts/restore-pg.sh caminho/do/backup.sql.gz
```

**Critério:** restore sobe e smoke C5 passa.

## 6. Smoke contra produção

```bash
export BASE_URL=https://SEU_DOMINIO
export INTERNAL_SIM_TOKEN=...
node tests/smoke/run-all.js
```

Esperado: C1/C2/C3/C5 verdes (ajustes de TLS/self-signed se necessário).

## 7. Observabilidade

- Logs JSON da API
- `/metrics` com `Authorization: Bearer $METRICS_TOKEN`
- Request-id em erros

## Riscos conhecidos

- Baileys: ban possível — ver O-08 em ARCHITECTURE.md
- Secrets: rotacionar se já vazaram em histórico git
