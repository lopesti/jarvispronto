# JARVIS Pronto — Backend v1.5
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./

# Instala apenas o que está declarado em package.json (P0 item 3)
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/auth_info_jarvis /app/logs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "engine/app.js"]
