import { Client } from "minio";
import type { ApiEnv } from "@sts/env";
import type { StorageService, UploadInput } from "./storage.service.js";

export function createMinioStorage(env: ApiEnv): StorageService {
  const client = new Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
  const bucket = env.MINIO_BUCKET;
  // Signing is offline, so a second client bound to the public address produces URLs browsers can open.
  // An explicit region skips the network lookup a client would otherwise make against that address.
  const publicClient = env.MINIO_PUBLIC_ENDPOINT
    ? new Client({
        endPoint: env.MINIO_PUBLIC_ENDPOINT,
        port: env.MINIO_PUBLIC_PORT ?? (env.MINIO_PUBLIC_USE_SSL ?? env.MINIO_USE_SSL ? 443 : 80),
        useSSL: env.MINIO_PUBLIC_USE_SSL ?? env.MINIO_USE_SSL,
        accessKey: env.MINIO_ACCESS_KEY,
        secretKey: env.MINIO_SECRET_KEY,
        region: "us-east-1",
      })
    : client;

  return {
    async upload(input: UploadInput) {
      const exists = await client.bucketExists(bucket).catch(() => false);
      if (!exists) await client.makeBucket(bucket, "");
      await client.putObject(bucket, input.key, Buffer.from(input.body), undefined, {
        "Content-Type": input.contentType ?? "application/octet-stream",
      });
      return { key: input.key };
    },
    async remove(key: string) {
      await client.removeObject(bucket, key);
    },
    async getPresignedUrl(key: string, expiresSeconds = 3600) {
      return publicClient.presignedGetObject(bucket, key, expiresSeconds);
    },
  };
}
