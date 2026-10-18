# STS API image. Build from REPO ROOT so Bun workspaces resolve:
#   docker build -f apps/api/Dockerfile -t sts-api .
FROM oven/bun:1.3 AS runtime
WORKDIR /app

# Workspace manifests first for layer caching (Bun requires every
# workspace package.json to match the lockfile).
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
RUN bun install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api
WORKDIR /app/apps/api

ENV API_PORT=3000
EXPOSE 3000
# Run unprivileged (the base image ships a `bun` user).
USER bun
CMD ["bun", "src/index.ts"]
