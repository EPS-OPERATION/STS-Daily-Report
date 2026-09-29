# STS Web image (static build + nginx). Build from REPO ROOT:
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=... -t sts-web .
FROM oven/bun:1.3 AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

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
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
