# ============================================
# Ticketeria API - Multi-stage Dockerfile (npm workspaces)
# Context build: monorepo root (.)
# ============================================

# Stage 1: Build (instala tudo e compila)
FROM node:20-alpine AS build
WORKDIR /repo

# Copia manifests do root + workspaces que a API precisa
COPY package.json package-lock.json ./
COPY ticketeria-api/package.json ./ticketeria-api/
COPY ticketeria-types/package.json ./ticketeria-types/

# Instala deps com workspaces
RUN npm ci

# Copia código-fonte
COPY ticketeria-types ./ticketeria-types
COPY ticketeria-api ./ticketeria-api

# Build da API: gera prisma client + transpila TS
WORKDIR /repo/ticketeria-api
# DATABASE_URL dummy pra prisma.config.ts resolver no generate (não usa DB de fato)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build

# Stage 2: Produção
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Cria user não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ticketeria -u 1001

# Copia node_modules do root (hoisted pelo npm workspaces) + os do package específico
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/ticketeria-api/node_modules ./ticketeria-api/node_modules
COPY --from=build /repo/ticketeria-types ./ticketeria-types

# Artefatos da API
COPY --from=build /repo/ticketeria-api/dist ./dist
COPY --from=build /repo/ticketeria-api/prisma ./prisma
COPY --from=build /repo/ticketeria-api/package.json ./package.json

USER ticketeria
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/health || exit 1

CMD ["node", "dist/server.js"]
