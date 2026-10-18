# STS Web image (static build + nginx). Build from REPO ROOT:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=... -t sts-web .
FROM oven/bun:1.3 AS build
WORKDIR /app
# Same-origin by default (reverse proxy routes /api to the API); pass a full URL to point elsewhere.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
# Optional error reporting (Sentry-protocol DSN). Blank = off. Baked into the bundle at build time.
ARG VITE_SENTRY_DSN=""
ARG VITE_SENTRY_ENVIRONMENT=""
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT}

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
RUN bun install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN bun run build

FROM nginx:1.27-alpine AS runtime
# The official nginx image renders *.template files with the container environment at start-up.
COPY apps/web/default.conf.template /etc/nginx/templates/default.conf.template
COPY apps/web/security-headers.inc.template /etc/nginx/templates/security-headers.inc.template
# Extra origins the browser may call (CSP connect-src). Empty = same origin only (production).
ENV CSP_CONNECT_EXTRA=""
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
