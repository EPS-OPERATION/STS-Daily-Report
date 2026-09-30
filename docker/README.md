# docker/

Local development services.

- Default: `postgres` 5432 (volume `pgdata`, healthcheck `pg_isready`) and `minio` 9000 API / 9001 console (volume `miniodata`).
- `app` profile: `api` and `web` images. The normal `bun dev` workflow builds and waits for `api` in Docker, then runs Vite locally.

Run from repo root:

```sh
bun docker:up
docker compose --profile app up -d --build --wait api
bun run dev:web
```

Rerunning `bun dev` rebuilds the API image when its inputs changed. To rebuild only the API manually, use the Compose command above.
