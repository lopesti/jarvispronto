# Arquitetura JARVIS Comercial

## Stack
API Node 20 + Express 5, Next.js 15, PostgreSQL 16, Redis/BullMQ, Baileys 7, Groq+Gemini.

## O-08 WhatsApp
Baileys (nao oficial) e o canal atual. Risco de ban. Plano: Cloud API Meta no Diamante; Baileys experimental. Abstrair whatsappService.

## Multi-tenant
JWT com companyId; isolamento por company_id.

## Tempo real
SSE notifications, Web Push, polling 30-60s.

## Billing
Planos + Asaas. Features do seed alinhadas ao implementado (F-13).


## O-08 — Baileys vs WhatsApp Business Cloud API (estrategia)

### Comparativo

| Aspecto | Baileys (atual) | Cloud API (Meta) |
|---------|-----------------|------------------|
| Oficial | Nao | Sim |
| Setup | QR em minutos | Conta Business + verificacao |
| Risco de ban | Medio/alto | Baixo (termos oficiais) |
| Custo | Zero de API | Conversas + BSP |
| Templates outbound | Livre (com risco) | Templates aprovados |
| SLA | Nenhum | Meta / BSP |
| Multi-numero | Possivel por sessao | Contas oficiais |

### Quando migrar
- Clientes pagantes Diamante / compliance
- Volume alto ou ban recorrente
- Necessidade de iniciar conversa fora da janela 24h com template

### Plano em 3 fases (nao implementado no TCC)
1. **Feature flag** `WHATSAPP_PROVIDER=baileys|meta` em whatsappService
2. **Dual-write** — receber em ambos em ambiente de homologacao
3. **Switch** — producao no Meta; Baileys so em trial/experimental

### Pre-requisitos Cloud API
- Meta Business Manager verificado
- Numero de telefone aprovado
- App Meta com WhatsApp product
- Templates de mensagem aprovados
- Webhook publico HTTPS + token de verificacao

### Decisao atual (TCC)
Manter Baileys para demo e MVP. Documentar risco. Abstrair envio/status no `whatsappService` para troca futura sem reescrever CRM/IA.


## Backlog pos-TCC (intencional)

### F-10 — Midia no WhatsApp
- Hoje: processa `notify` + texto; caption de imagem se existir; ignora `append`
- Futuro: `audioMessage` via Groq Whisper; OCR/caption enriquecido para imagem
- Nao bloqueia TCC (escopo texto + funil)

### S-09 — Auth hygiene avancada
- Verificacao de e-mail no register
- Forgot/reset password
- AUTH_CHECK_DB ja opcional (S-10)
- Documentado; implementacao pos-lancamento

### Q-02.1 — RLS
- Isolamento atual por `company_id` na aplicacao
- RLS exigiria `SET LOCAL app.company_id` em toda query — alto risco de regressao
- Reavaliar apos testes de carga e multi-replica
