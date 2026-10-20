import { authenticate, type Authenticated } from "./auth.service.js";

const perRequest = new WeakMap<Request, Promise<Authenticated | null>>();

/** The hosted-mode hook in app.ts and `requireAuth` both need the caller: look it up once per request. */
export function authenticateRequest(request: Request, rawToken: string | undefined) {
  let result = perRequest.get(request);
  if (!result) {
    result = authenticate(rawToken);
    perRequest.set(request, result);
  }
  return result;
}
