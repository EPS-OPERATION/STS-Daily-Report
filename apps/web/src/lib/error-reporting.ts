import { config } from "@/config.js";
import { scrubBreadcrumb, scrubBrowserEvent } from "@/lib/error-scrub.js";

// Optional error reporting to any Sentry-protocol server (Sentry, GlitchTip, Bugsink). Without VITE_SENTRY_DSN nothing
// is loaded or sent. The SDK is a separate chunk fetched after the app starts, so it never delays first paint.
type SentryModule = typeof import("@sentry/react");
let sentry: Promise<SentryModule | null> | null = null;

export function initErrorReporting(): void {
  if (!config.sentryDsn || sentry) return;
  sentry = import("@sentry/react")
    .then((S) => {
      S.init({
        dsn: config.sentryDsn,
        environment: config.sentryEnvironment || undefined,
        // Sentry v11 collects almost everything by default; switch every category off (the scrubbers below back this up).
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
        beforeSend: (event) => scrubBrowserEvent(event),
        beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
        // Flaky mobile networks are expected in the field (the uptime monitor watches the API itself); a failed
        // dynamic import after a deploy is NOT ignored: that one means a stale tab needs a reload.
        ignoreErrors: [/^ResizeObserver loop/, /^(TypeError: )?Failed to fetch$/, /^TypeError: (Load failed|NetworkError when attempting to fetch resource\.)$/],
      });
      return S;
    })
    .catch(() => null);
}

// For errors the app catches itself (route error screen). Uncaught errors are reported by the SDK on its own.
export function reportError(error: unknown): void {
  void sentry?.then((S) => S?.captureException(error));
}
