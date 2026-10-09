# Separacao de acessos (multi-tenant)

## Problema anterior

Um unico WhatsApp (Baileys) era global. Qualquer usuario novo no painel usava o mesmo numero.

## Modelo atual

1. No **registro**, o sistema cria uma **empresa** (`companies`) e vincula o usuario (`users.company_id`).
2. JWT inclui `companyId`.
3. Conversas e mensagens sao filtradas por `company_id`.
4. WhatsApp: sessao em `auth_info_jarvis/company_{id}/` — **um numero por empresa**.

## Fluxo do usuario

1. Registrar / login
2. `POST /api/whatsapp/connect` (Bearer token)
3. `GET /api/whatsapp/qr` ate obter imagem
4. Escanear QR no celular **dessa empresa**
5. `GET /api/whatsapp/status` → `connected: true`

## API

| Metodo | Rota | Auth |
|--------|------|------|
| GET | /api/whatsapp/status | JWT |
| POST | /api/whatsapp/connect | JWT |
| GET | /api/whatsapp/qr | JWT |
| GET | /api/whatsapp/qr-image | JWT |
| POST | /api/whatsapp/disconnect | JWT body `{ "clearAuth": true }` opcional |

## Migracao

Arquivo: `engine/migrations/014_multi_tenant.sql`

Usuarios antigos vao para a empresa `default`. **Cada cadastro novo** gera empresa nova e WhatsApp isolado.

Apos atualizar, reconecte o WhatsApp (QR) por conta — pastas de auth antigas na raiz podem ser ignoradas.
