// Browser error reports must not carry personal or secret data. URLs lose their query string and hash
// (a reset-password link holds its token in `?token=`), and cookies, bodies and the user are dropped.
export const stripQuery = (url: string): string => url.split(/[?#]/)[0] ?? url;

interface Breadcrumb {
  data?: Record<string, unknown>;
}

interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
  breadcrumbs?: Breadcrumb[];
}

const URL_FIELDS = ["url", "from", "to"] as const;

export function scrubBreadcrumb<T extends Breadcrumb>(crumb: T): T {
  const data = crumb.data;
  if (data) for (const field of URL_FIELDS) if (typeof data[field] === "string") data[field] = stripQuery(data[field]);
  return crumb;
}

export function scrubBrowserEvent<T extends ScrubbableEvent>(event: T): T {
  const e: ScrubbableEvent = event;
  if (e.request) {
    delete e.request.cookies;
    delete e.request.data;
    delete e.request.query_string;
    if (e.request.url) e.request.url = stripQuery(e.request.url);
    const headers = e.request.headers;
    if (headers) for (const name of Object.keys(headers)) if (/^referer$/i.test(name)) headers[name] = stripQuery(headers[name] ?? "");
  }
  e.user = undefined;
  e.breadcrumbs?.forEach(scrubBreadcrumb);
  return event;
}
