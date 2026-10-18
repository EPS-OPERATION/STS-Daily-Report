import { captureServerError } from "./sentry.js";

// Every unexpected (non-AppError) failure on its way to a 500: written to the process log (docker logs / Vercel
// logs) and, when configured, sent to the error tracker. Routes that carry credentials or personal data
// (sensitive) only report the error TYPE, because database and validator messages can echo submitted values.
export function reportUnexpectedError(error: unknown, request: { method: string; path: string; sensitive: boolean }): void {
  const name = error instanceof Error ? error.name : typeof error;
  if (request.sensitive) {
    console.error(`[api] unexpected ${name} on ${request.method} ${request.path}`);
    captureServerError(new Error(`Unexpected ${name} on a sensitive route`), request);
    return;
  }
  console.error(`[api] unexpected error on ${request.method} ${request.path}`, error instanceof Error ? (error.stack ?? error.message) : error);
  captureServerError(error, request);
}
