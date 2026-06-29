# Monorepo root Dockerfile for Railway when Root Directory is not set to /backend.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache wget

FROM base AS deps
COPY backend/package.json ./
RUN npm install --omit=dev && cp -R node_modules prod_node_modules
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/prod_node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY backend/package.json ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/api/health" || exit 1
CMD ["node", "dist/index.js"]
