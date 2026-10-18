// Copies every object the database refers to from a SOURCE bucket (Supabase Storage, or another MinIO) into the
// storage configured by the normal env (STORAGE_PROVIDER / MINIO_*), under the same keys. Run it when leaving
// Supabase for the VPS, after restoring the database:
//
//   SRC_PROVIDER=supabase SRC_SUPABASE_URL=https://xyz.supabase.co SRC_SUPABASE_SERVICE_ROLE_KEY=... SRC_BUCKET=sts \
//   DATABASE_URL=... STORAGE_PROVIDER=minio MINIO_ENDPOINT=... bun --env-file=../../.env scripts/copy-storage.ts [--dry-run]
//
// SRC_PROVIDER=minio (SRC_MINIO_ENDPOINT/PORT/ACCESS_KEY/SECRET_KEY/USE_SSL, SRC_BUCKET) copies between two MinIO buckets.
// Existing destination objects are overwritten (same bytes), so the script is safe to re-run.
import { isNotNull } from "drizzle-orm";
import { getEnv } from "../src/config/env.js";
import { getDb } from "../src/db/client.js";
import { dailyReportPhotos, droneLogs, sitePlans } from "../src/db/schema/index.js";
import { createMinioStorage } from "../src/shared/storage/minio-storage.js";
import { createSupabaseStorage } from "../src/shared/storage/supabase-storage.js";
import { getStorage } from "../src/shared/storage/index.js";
import type { StorageService } from "../src/shared/storage/storage.service.js";

const dryRun = process.argv.includes("--dry-run");
const env = getEnv();

function sourceStorage(): StorageService {
  const provider = process.env.SRC_PROVIDER ?? "supabase";
  const bucket = process.env.SRC_BUCKET ?? "sts";
  if (provider === "minio") {
    return createMinioStorage({
      ...env,
      MINIO_ENDPOINT: process.env.SRC_MINIO_ENDPOINT ?? env.MINIO_ENDPOINT,
      MINIO_PORT: Number(process.env.SRC_MINIO_PORT ?? env.MINIO_PORT),
      MINIO_ACCESS_KEY: process.env.SRC_MINIO_ACCESS_KEY ?? env.MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY: process.env.SRC_MINIO_SECRET_KEY ?? env.MINIO_SECRET_KEY,
      MINIO_USE_SSL: process.env.SRC_MINIO_USE_SSL === "true",
      MINIO_BUCKET: bucket,
      MINIO_PUBLIC_ENDPOINT: undefined,
    });
  }
  const url = process.env.SRC_SUPABASE_URL;
  const key = process.env.SRC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SRC_SUPABASE_URL and SRC_SUPABASE_SERVICE_ROLE_KEY (or SRC_PROVIDER=minio).");
  return createSupabaseStorage({ ...env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, STORAGE_BUCKET: bucket });
}

const db = getDb();
const keys = new Set<string>();
for (const r of await db.select({ k: dailyReportPhotos.objectKey }).from(dailyReportPhotos)) keys.add(r.k);
for (const r of await db.select({ k: droneLogs.objectKey }).from(droneLogs)) keys.add(r.k);
for (const r of await db.select({ k: sitePlans.backgroundObjectKey }).from(sitePlans).where(isNotNull(sitePlans.backgroundObjectKey))) if (r.k) keys.add(r.k);

const source = sourceStorage();
const dest = getStorage();
console.log(`${keys.size} object key(s) referenced by the database${dryRun ? " (dry run: nothing is written)" : ""}`);

let copied = 0;
const failed: string[] = [];
for (const key of keys) {
  try {
    const res = await fetch(await source.getPresignedUrl(key, 600));
    if (!res.ok) throw new Error(`source answered ${res.status}`);
    const body = new Uint8Array(await res.arrayBuffer());
    if (!dryRun) await dest.upload({ key, body, contentType: res.headers.get("content-type") ?? undefined });
    copied += 1;
    console.log(`${dryRun ? "would copy" : "copied"} ${key} (${body.byteLength} bytes)`);
  } catch (error) {
    failed.push(key);
    console.error(`FAILED ${key}: ${error instanceof Error ? error.message : error}`);
  }
}
console.log(`done: ${copied} ok, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
