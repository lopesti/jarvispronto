# JARVIS Comercial — Frontend

Dashboard moderno do sistema **JARVIS Comercial** (bot de vendas WhatsApp com IA).

## Stack

| Tecnologia | Uso |
|------------|-----|
| **Next.js 15** (App Router) | Framework |
| **React 19** | UI |
| **TypeScript** | Tipagem |
| **Tailwind CSS** | Estilização |
| **TanStack Query** | Data fetching |
| **Zustand** | Estado global |
| **Recharts** | Gráficos |
| **Lucide React** | Ícones |
| **Axios** | HTTP client |

## Telas incluídas

| Rota | Descrição |
|------|-----------|
| `/` | Landing Page (propaganda do produto) |
| `/login` | Login |
| `/register` | Cadastro |
| `/overview` | Painel principal (KPIs) |
| `/conversations` | Lista de chats + conversa |
| `/pipeline` | Funil Kanban |
| `/leads` | Tabela de leads |
| `/analytics` | Métricas |
| `/settings` | WhatsApp, IA, backend |

## Como rodar

```bash
# 1. Entre na pasta
cd jarvis-frontend

# 2. Instale as dependências
npm install

# 3. Configure a URL do backend
cp .env.example .env
# Edite NEXT_PUBLIC_API_URL se necessário (padrão: http://localhost:3000)

# 4. Suba em desenvolvimento
npm run dev
```

Acesse: **http://localhost:3001** (ou a porta que o Next indicar)

## Estrutura

```
jarvis-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── overview/
│   │   ├── conversations/
│   │   ├── pipeline/
│   │   ├── leads/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── layout.tsx      # Sidebar + área principal
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── providers.tsx       # React Query
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── ui/
│   └── charts/
├── lib/
│   ├── api.ts              # Cliente HTTP → backend Express
│   └── utils.ts
├── stores/
│   └── ui-store.ts         # Zustand
├── types/
│   └── index.ts
└── public/
```

## Integração com o backend

O frontend consome a API do **JarvisPronto** (Express):

| Endpoint | Uso |
|----------|-----|
| `GET /api/stats` | KPIs do Overview |
| `GET /api/conversations` | Lista de conversas |
| `GET /api/messages/:phone` | Histórico de mensagens |
| `GET /api/leads` | Tabela de leads |
| `GET /api/pipeline` | Funil |
| `POST /api/send` | Enviar mensagem manual |
| `GET /health` | Status do bot |

Configure a URL em `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Dados mock

As telas já funcionam com **dados de exemplo** (mock).  
Quando o backend estiver rodando, substitua os mocks pelas chamadas em `lib/api.ts` usando TanStack Query.

## Próximos passos

1. Conectar endpoints reais do backend
2. Adicionar autenticação (Bearer token)
3. Instalar shadcn/ui completo (`npx shadcn@latest init`)
4. Adicionar gráficos Recharts nos placeholders
5. WebSocket / polling para conversas em tempo real

## Scripts

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Rodar build
npm run lint     # ESLint
```

---

**JARVIS Comercial** — Sistema Operacional Cognitivo de Vendas  
Frontend Dashboard • 2026
