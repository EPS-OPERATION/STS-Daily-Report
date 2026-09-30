import { config } from "@/config.js";

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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await parseBody(res);
  if (!res.ok) {
    const shape = body as Partial<ApiErrorShape>;
    throw new HttpError(
      res.status,
      shape?.error?.code ?? "UNKNOWN_ERROR",
      shape?.error?.message ?? `Request failed (${res.status})`,
      shape?.error?.details,
    );
  }
  return body as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
