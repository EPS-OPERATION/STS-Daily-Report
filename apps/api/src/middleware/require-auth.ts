import { Elysia } from "elysia";
import { getEnv } from "@/config/env.js";
import { AuthRequiredError } from "@/shared/errors/app-error.js";
import { loadAuthContext, resolveAuthIdentity } from "@/auth/auth.service.js";

// Reusable guard. Reads ONLY the session cookie, resolves an AuthIdentity,
// and attaches context.auth. Feature routes consume context.auth and never
// touch cookies or sessions directly. (Bearer tokens can later resolve to
// the same identity via resolveAuthIdentity without touching features.)
export const requireAuth = new Elysia()
  .derive(async ({ cookie }) => {
    const { SESSION_COOKIE_NAME } = getEnv();
    const jar = (cookie as Record<string, { value?: unknown } | undefined>)[SESSION_COOKIE_NAME];
    const raw = typeof jar?.value === "string" ? jar.value : undefined;
    const identity = await resolveAuthIdentity(raw);
    if (!identity) throw new AuthRequiredError();
    const auth = await loadAuthContext(identity);
    return { auth };
  })
  .as("scoped");
