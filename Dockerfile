# JARVIS Pronto — Backend
FROM node:20-bookworm-slim

# Dependências do sistema (úteis para Baileys / crypto / certificados)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia package.json primeiro (cache de layers)
COPY package.json package-lock.json* ./

# Instala dependências de produção
RUN npm install --omit=dev

# INSTALAR MISTRAL
RUN npm install @mistralai/mistralai

# Copia o restante do código
COPY . .

# Pasta para sessão do WhatsApp (Baileys auth)
RUN mkdir -p /app/auth_info /app/logs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck simples
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "engine/app.js"]
