# docker/

Local dev infrastructure only. No app images here yet.

- `postgres` 5433 (host port, container 5432, volume `pgdata`, healthcheck `pg_isready`)
- `minio` 9002 API / 9003 console (host ports, container 9000/9001, volume `miniodata`)

Run from repo root:

```sh
bun docker:up
bun docker:logs
```
