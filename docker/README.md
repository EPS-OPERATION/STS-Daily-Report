# docker/

Local dev infrastructure only. No app images here yet.

- `postgres` 5432 (volume `pgdata`, healthcheck `pg_isready`)
- `minio` 9000 API / 9001 console (volume `miniodata`)

Run from repo root:

```sh
bun docker:up
bun docker:logs
```
