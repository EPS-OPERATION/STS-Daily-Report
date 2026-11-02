import { parseApiEnv, type ApiEnv } from "@sts/env";

let cached: ApiEnv | null = null;

export function getEnv(): ApiEnv {
  if (!cached) cached = parseApiEnv(process.env as Record<string, unknown>);
  return cached;
}

export const env: ApiEnv = getEnv();
