// Request data that must never leave the server in an error report: cookies and auth headers, bodies (they can
// hold passwords), and query strings (reset-password links carry a token). Applied before every Sentry event.
interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
}

const SENSITIVE_HEADER = /^(cookie|set-cookie|authorization|proxy-authorization|x-forwarded-for|x-real-ip)$/i;

export const stripQuery = (url: string): string => url.split(/[?#]/)[0] ?? url;

export function scrubServerEvent<T extends ScrubbableEvent>(event: T): T {
  const e: ScrubbableEvent = event;
  if (e.request) {
    delete e.request.cookies;
    delete e.request.data;
    delete e.request.query_string;
    if (e.request.url) e.request.url = stripQuery(e.request.url);
    const headers = e.request.headers;
    if (headers) for (const name of Object.keys(headers)) if (SENSITIVE_HEADER.test(name)) delete headers[name];
  }
  e.user = undefined;
  return event;
}
