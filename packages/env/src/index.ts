import { z } from "zod";

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === "true" || v === "1")
  .pipe(z.boolean());

// A blank `NAME=` line counts as unset.
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = z.preprocess(blankToUndefined, z.string().trim().min(1).optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().trim().url().optional());

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Migrations need a session-capable connection (Supabase: session pooler :5432 or direct), not the
  // transaction pooler used by the running API. Unset = DATABASE_URL.
  MIGRATE_DATABASE_URL: z.string().min(1).optional(),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("sts"),
  MINIO_USE_SSL: boolFromString.default(false),
  // Browser-facing MinIO address used to sign photo URLs (the internal MINIO_ENDPOINT is unreachable from browsers
  // on a VPS). Unset = same as the internal one. Example: files.example.com / 443 / true.
  MINIO_PUBLIC_ENDPOINT: z.string().optional(),
  MINIO_PUBLIC_PORT: z.coerce.number().int().positive().optional(),
  MINIO_PUBLIC_USE_SSL: boolFromString.optional(),
  // "minio" (local docker) or "supabase" (Supabase Storage REST, used on Vercel).
  STORAGE_PROVIDER: z.enum(["minio", "supabase"]).default("minio"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().default("sts"),
  // Trial mode: contractors may re-send the morning/evening report (and edit photos) any
  // number of times instead of locking after submit. Off = normal locking.
  ALLOW_RESUBMIT: boolFromString.default(false),
  // Hourly site-weather pull inside the API process (HH:05 Asia/Bangkok, plus once at start).
  WEATHER_CRON: boolFromString.default(true),
  // Bearer secret for POST /api/v1/internal/weather/sync (external schedulers); unset = endpoint off.
  // A blank `CRON_SECRET=` line counts as unset.
  CRON_SECRET: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().min(16).optional()),
  // Optional error reporting to any Sentry-protocol server (Sentry, GlitchTip, Bugsink). Unset = off.
  SENTRY_DSN: optionalUrl,
  SENTRY_ENVIRONMENT: optionalText,
  SENTRY_RELEASE: optionalText,
  // Optional dead-man's-switch (Healthchecks.io style): pinged after each successful hourly weather sync, `<url>/fail` after a failed one.
  WEATHER_HEARTBEAT_URL: optionalUrl,
  // Behind a trusted reverse proxy / Vercel: take the client IP from X-Forwarded-For (rate limits). Off when the API is exposed directly.
  TRUST_PROXY: boolFromString.default(false),
  // Canonical URL for links; WEB_ORIGIN may contain multiple CORS origins.
  WEB_URL: z.string().url().optional(),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  SESSION_COOKIE_NAME: z.string().min(1).default("sts_session"),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(24),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(raw: Record<string, unknown> = process.env): ApiEnv {
  const parsed = apiEnvSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid API env: ${JSON.stringify(details)}`);
  }
  const env = parsed.data;
  if (env.STORAGE_PROVIDER === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("STORAGE_PROVIDER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return env;
}

export const webEnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3000/api/v1"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
