import { Elysia } from "elysia";
import { getEnv } from "@/config/env.js";
import { ok } from "@/shared/http/response.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { loadMe, loginWithEmail, logoutSession } from "./auth.service.js";
import { loginBody } from "./auth.schema.js";

function cookieJar(cookie: Record<string, { value?: unknown } | undefined>) {
  const { SESSION_COOKIE_NAME } = getEnv();
  const jar = cookie[SESSION_COOKIE_NAME] as
    | {
        value?: string;
        set: (opts: Record<string, unknown>) => void;
        remove: () => void;
      }
    | undefined;
  return jar;
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, cookie, set }) => {
      const { context, token, expiresAt } = await loginWithEmail(body.email);
      const env = getEnv();
      const jar = cookieJar(cookie as Record<string, { value?: unknown } | undefined>);
      jar?.set({
        value: token,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge: env.SESSION_TTL_HOURS * 3600,
        expires: expiresAt,
      });
      set.status = 201;
      const contractors = await loadMe({
        userId: context.user.id,
        email: context.user.email,
        method: "session",
      }).then((me) => me.data.contractors);
      return ok({ user: context.user, contractors });
    },
    { body: loginBody },
  )
  .use(requireAuth)
  .get("/me", async ({ auth }) => {
    return loadMe({ userId: auth.user.id, email: auth.user.email, method: auth.identity.method });
  })
  .post("/logout", async ({ cookie }) => {
    const jar = cookieJar(cookie as Record<string, { value?: unknown } | undefined>);
    const raw = typeof jar?.value === "string" ? jar.value : undefined;
    await logoutSession(raw);
    jar?.remove();
    return ok({ ok: true });
  });
