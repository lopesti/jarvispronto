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
