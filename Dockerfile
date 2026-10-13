# JARVIS Pronto — Backend (O-10 hardening)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/auth_info_jarvis /app/logs /app/data \
    && chown -R node:node /app

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "engine/app.js"]
