import { config } from "@/config.js";
import { reportError } from "@/lib/error-reporting.js";

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Infrastructure failures (bad gateway, wrong base URL, offline) come back without
// the app error envelope; keep the user-facing text meaningful instead of raw status.
const FALLBACK_MESSAGE: Record<number, string> = {
  400: "Invalid request. Please check the entered data.",
  401: "Invalid email, username or password.",
  403: "You are not allowed to do this.",
  404: "The requested service is unavailable. Please try again.",
  429: "Too many attempts. Please try again later.",
  500: "Server error. Please try again.",
  502: "Server error. Please try again.",
  503: "Service is temporarily unavailable. Please try again.",
  504: "Service is temporarily unavailable. Please try again.",
};

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    credentials: "include",
    ...init,
    // FormData sets its own multipart boundary header.
    headers: init.body instanceof FormData ? { ...(init.headers ?? {}) } : { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await parseBody(res);
  if (!res.ok) {
    const shape = body as Partial<ApiErrorShape>;
    const raw = shape?.error?.message;
    // A raw validator/JSON blob (e.g. an old tab hitting a newer API) must never reach the user: fall back to a
    // plain message. Clean app messages pass through unchanged.
    const safe = raw && !raw.trim().startsWith("{") && !raw.trim().startsWith("[") ? raw : (FALLBACK_MESSAGE[res.status] ?? `Request failed (${res.status})`);
    const err = new HttpError(res.status, shape?.error?.code ?? "UNKNOWN_ERROR", safe, shape?.error?.details);
    // Log the real failure for diagnosis (browser console, and the error reporter when configured); what the UI
    // shows the user stays friendly.
    console.error(`[api] ${init.method ?? "GET"} ${path} → ${res.status} ${err.code}`, raw ?? "", shape?.error?.details ?? "");
    if (res.status >= 500 || err.code === "UNKNOWN_ERROR") reportError(err);
    throw err;
  }
  return body as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};
