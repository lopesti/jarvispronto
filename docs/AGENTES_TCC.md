# Agent Builder — Upgrade TCC

## O que é
Módulo de **1 Agente de IA por Produto**, inspirado no layout do IBM AI Agent Builder, nativo no Jarvis TCC.

## Funcionalidades
- Aba **Agentes** na sidebar
- Criar agente vinculado a um produto
- Templates: vendas, suporte, qualificação, pós-venda, custom
- Knowledge automático (nome, descrição, preço, estoque do produto)
- Tools (consultar estoque, encaminhar humano, etc.)
- Channels (whatsapp, webchat, instagram)
- Behavior (system prompt + welcome)
- Preview de teste
- Versionamento a cada save
- Publish / Archive
- Superadmin: `GET /api/agents/global`

## Endpoints
```
GET    /api/agents
GET    /api/agents/templates
GET    /api/agents/global          (superadmin)
GET    /api/agents/produto/:id
GET    /api/agents/:id
POST   /api/agents
PUT    /api/agents/:id
POST   /api/agents/:id/publish
POST   /api/agents/:id/archive
POST   /api/agents/:id/preview
DELETE /api/agents/:id
```

## Migration
`027_create_agents.sql`

## Como subir
1. Rodar migrations
2. Reiniciar backend
3. Acessar /agents no frontend

## Integração futura com geminiService
O `system_prompt` do agente publicado pode ser carregado no fluxo de conversa quando a mensagem for sobre aquele produto (produto_id no contexto).

## Integração com o fluxo de conversa (WhatsApp)

Quando chega uma mensagem e o bot está ativo (`bot_mode` ≠ human e sem handoff):

1. `Agent.resolveForConversation(companyId, texto, conversa)` escolhe o agente:
   - se a conversa já tem `agent_id` e o agente está **published** → mantém
   - se o tenant tem **só 1** agente published → usa esse
   - senão tenta **match do nome do produto** no texto da mensagem
   - se nada casar → prompt genérico do tenant + catálogo (comportamento antigo)
2. O `system_prompt` do agente (com knowledge de preço/estoque) vai para Groq/Gemini
3. A conversa recebe `agent_id` + `produto_id` para continuidade

### Migrations necessárias
- `027_create_agents.sql`
- `028_conversation_agent.sql` (colunas `agent_id` e `produto_id` em `conversations`)

### Como testar na demo
1. Criar produto (ex.: "Escova Alisadora")
2. Criar agente para o produto → template Vendas → **Publicar**
3. Mandar WhatsApp mencionando o produto ou, se for o único agente, qualquer mensagem
4. Log deve mostrar: `Usando AGENTE id=...`
5. Resposta deve respeitar preço/estoque do knowledge do agente
