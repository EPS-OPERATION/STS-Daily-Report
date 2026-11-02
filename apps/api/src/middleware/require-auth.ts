import { Elysia } from "elysia";
import { getEnv } from "@/config/env.js";
import { AuthRequiredError } from "@/shared/errors/app-error.js";
import { authenticateRequest } from "@/auth/request-auth.js";

// Reusable guard. Reads ONLY the session cookie, resolves the caller (one
// query, shared with the hosted-mode hook in app.ts) and attaches context.auth.
// Feature routes consume context.auth and never touch cookies or sessions
// directly. (Bearer tokens can later resolve to the same identity via
// authenticate without touching features.)
export const requireAuth = new Elysia()
  .derive(async ({ cookie, request }) => {
    const { SESSION_COOKIE_NAME } = getEnv();
    const jar = (cookie as Record<string, { value?: unknown } | undefined>)[SESSION_COOKIE_NAME];
    const raw = typeof jar?.value === "string" ? jar.value : undefined;
    const authenticated = await authenticateRequest(request, raw);
    if (!authenticated) throw new AuthRequiredError();
    return { auth: authenticated.context };
  })
  .as("scoped");
