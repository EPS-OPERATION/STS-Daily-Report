import { z } from "zod";

const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === "true" || v === "1")
  .pipe(z.boolean());

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("sts"),
  MINIO_USE_SSL: boolFromString.default(false),
  // TEMPORARY development-only provider. See local-email-auth.ts.
  AUTH_PROVIDER: z.enum(["local-email"]).default("local-email"),
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
  // Mandatory production guard: email-only lookup is NOT real identity
  // verification and must never run in production.
  if (env.NODE_ENV === "production" && env.AUTH_PROVIDER === "local-email") {
    throw new Error(
      "Refusing to start: AUTH_PROVIDER=local-email is development-only and forbidden in production.",
    );
  }
  return env;
}

export const webEnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3000/api/v1"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
