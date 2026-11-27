# Jarvis — Sistema de Observabilidade

Stack leve para **Docker Compose** (Azure VM / PC local), sem Kubernetes obrigatório.

## O que inclui

| Componente | Porta | Função |
|------------|-------|--------|
| **Prometheus** | 9090 | Coleta métricas (API `/metrics`, containers) |
| **Grafana** | 3003 | Dashboards |
| **Loki** | 3100 | Logs centralizados |
| **Promtail** | — | Envia logs dos containers ao Loki |
| **cAdvisor** | 8088 | CPU/RAM/rede por container |

A API Jarvis **já expõe**:
- `GET /health` — está vivo?
- `GET /metrics` — contadores (IA, mensagens, auth, HTTP, uptime)

## Instalação no projeto

Na raiz do `jarvispronto` (junto do `docker-compose.yml`):

```bash
# 1. Copie a pasta observability para dentro do projeto
mkdir -p observability
# copie o conteúdo deste ZIP para ./observability/
# e o arquivo docker-compose.observability.yml para a RAIZ do projeto

# 2. No .env (produção), defina token de métricas:
METRICS_TOKEN=um_segredo_forte_aqui

# 3. Se usar METRICS_TOKEN, edite observability/prometheus/prometheus.yml
#    e descomente o bloco params.token

# 4. Suba o stack principal + observabilidade
docker compose -f docker-compose.yml -f docker-compose.observability.yml --profile observability up -d
```

## Acesso

- Grafana: http://localhost:3003  
  - usuário: `admin`  
  - senha: `jarvis-obs` (ou `GRAFANA_ADMIN_PASSWORD` no `.env`)
- Prometheus: http://localhost:9090  
- cAdvisor: http://localhost:8088  

Na Azure, abra só o necessário no NSG (ex.: 3003 só para seu IP).

## O que monitorar no TCC / produção

1. **API caiu?** — target `jarvis-api` down no Prometheus / Grafana
2. **Container reiniciando?** — cAdvisor + `docker compose ps`
3. **Pico de erro de login?** — `auth_failures_total`
4. **IA/WhatsApp?** — `ia_calls_total`, `messages_received_total`
5. **Logs de crash** — Grafana → Explore → Loki → `{container="jarvis-api"}`

## Azure (1 servidor)

Não precisa de Kubernetes. Rode Compose + este profile na mesma VM.  
Backup: volume do Postgres + retenção Prometheus 15 dias.

## Banca (frase)

> O sistema possui observabilidade em métricas de aplicação, recursos de container e logs centralizados, permitindo detectar indisponibilidade da API, falhas de autenticação e comportamento anômalo antes do impacto total ao usuário.
