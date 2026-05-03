# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.18.1

# ---------- Builder ----------
FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app

ENV NODE_ENV=development \
    npm_config_fund=false \
    npm_config_audit=false

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json tsconfig.server.json vite.config.ts vitest.config.ts \
     postcss.config.js index.html vite-env.d.ts ./
COPY shared ./shared
COPY client ./client
COPY server ./server

RUN npm run build

RUN npm prune --omit=dev

# ---------- Runtime ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    STORAGE_DIR=/var/lib/quak

RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init tini ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 quak \
 && useradd --system --uid 1001 --gid 1001 --no-create-home --shell /usr/sbin/nologin quak \
 && mkdir -p /var/lib/quak/data /var/lib/quak/uploads \
 && chown -R quak:quak /var/lib/quak

COPY --from=builder --chown=quak:quak /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=quak:quak /app/node_modules ./node_modules
COPY --from=builder --chown=quak:quak /app/dist ./dist
COPY --from=builder --chown=quak:quak /app/dist-server ./dist-server

USER quak:quak

EXPOSE 3001

VOLUME ["/var/lib/quak"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist-server/server/index.js"]
