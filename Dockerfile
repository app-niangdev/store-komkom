# ---- Étape 1 : build Angular (navigateur + serveur SSR) ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration production

# ---- Étape 2 : image d'exécution Node ----
# Le serveur SSR est entièrement empaqueté par Angular (express compris) :
# seul dist/ est nécessaire, sans node_modules.
FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    PORT=4300

WORKDIR /app
COPY --from=build --chown=node:node /app/dist/storefront ./dist/storefront

USER node
EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4300/healthz || exit 1

CMD ["node", "dist/storefront/server/server.mjs"]
