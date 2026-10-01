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
      if (env.MINIO_PUBLIC_URL) {
        const endpoint = new URL(env.MINIO_PUBLIC_URL);
        // Resolve region through the internal endpoint; signing must use the browser's Host.
        const signer = new Client({
          endPoint: endpoint.hostname,
          port: Number(endpoint.port || (endpoint.protocol === "https:" ? 443 : 80)),
          useSSL: endpoint.protocol === "https:",
          accessKey: env.MINIO_ACCESS_KEY,
          secretKey: env.MINIO_SECRET_KEY,
          region: await client.getBucketRegionAsync(bucket),
        });
        return signer.presignedGetObject(bucket, key, expiresSeconds);
      }
      return client.presignedGetObject(bucket, key, expiresSeconds);
    },
  };
}
