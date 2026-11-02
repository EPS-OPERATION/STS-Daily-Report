import * as Sentry from "@sentry/bun";
import type { ApiEnv } from "@sts/env";
import { scrubServerEvent } from "./scrub.js";

// Error reporting is optional: without SENTRY_DSN nothing is initialised and every call below is a no-op.
// The DSN may point at Sentry, GlitchTip or Bugsink (same protocol), so the server can change without code changes.
let enabled = false;

export function initSentry(env: Pick<ApiEnv, "SENTRY_DSN" | "SENTRY_ENVIRONMENT" | "SENTRY_RELEASE" | "NODE_ENV">): void {
  if (!env.SENTRY_DSN || env.NODE_ENV === "test") return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    // Sentry v11 collects almost everything by default (headers, cookies, query strings, DB data, local variables).
    // Switch every category off; scrubServerEvent below is a second line of defence, not the first.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    beforeSend: (event) => scrubServerEvent(event),
  });
  enabled = true;
}

export function captureServerError(error: unknown, request: { method: string; path: string }): void {
  if (!enabled) return;
  Sentry.captureException(error, { tags: { "http.method": request.method, "http.path": request.path } });
}

// Called on SIGTERM so the last reports are delivered before the process exits.
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!enabled) return;
  await Sentry.flush(timeoutMs).catch(() => false);
}
