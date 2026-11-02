import { Elysia } from "elysia";
import { normalizePagination } from "@sts/shared";
import { getEnv } from "@/config/env.js";
import { clientIp } from "./client-ip.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok, paginated } from "@/shared/http/response.js";
import { limitAuthAttempts, loadMe, loginWithPassword, logoutSession, registerUser, registrationOptions, registrationProjects } from "./auth.service.js";
import { loginBody, registerBody, resetPasswordBody } from "./auth.schema.js";
import { resetPassword } from "./password-reset.service.js";
import { listContractorsQuery } from "@/modules/contractors/contractor.schema.js";

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
  .onAfterHandle(({ set }) => { set.headers["cache-control"] = "no-store"; })
  // Public feature flags for the login/field pages (trial resubmit mode).
  .get("/config", () => ok({ allowResubmit: getEnv().ALLOW_RESUBMIT }))
  .get("/registration-options", async ({ query }) => {
    const p = normalizePagination(query);
    const { rows, total } = await registrationOptions({ ...p, projectId: query.projectId });
    return paginated(rows, p.page, p.pageSize, total);
  }, { query: listContractorsQuery })
  .get("/registration-projects", async () => ok(await registrationProjects()))
  .post("/register", async ({ body, set, server, request }) => {
    await limitAuthAttempts("register", clientIp(request.headers, server?.requestIP(request)?.address, getEnv().TRUST_PROXY), 100);
    const result = await registerUser(body);
    set.status = 201;
    return ok(result);
  }, { body: registerBody })
  .post("/reset-password", async ({ body, server, request }) => {
    await limitAuthAttempts("reset", clientIp(request.headers, server?.requestIP(request)?.address, getEnv().TRUST_PROXY), 60);
    return ok(await resetPassword(body.token, body.password));
  }, { body: resetPasswordBody })
  .post("/login", async ({ body, cookie, set }) => {
    const identifier = "identifier" in body ? body.identifier : body.email;
    await limitAuthAttempts("login", identifier.trim().toLowerCase(), 30);
    const { context, token, expiresAt } = await loginWithPassword(identifier, body.password);
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
    const contractors = await loadMe(context).then((me) => me.data.contractors);
    return ok({ user: context.user, contractors });
  }, { body: loginBody })
  .use(requireAuth)
  .get("/me", async ({ auth }) => loadMe(auth))
  .post("/logout", async ({ cookie }) => {
    const jar = cookieJar(cookie as Record<string, { value?: unknown } | undefined>);
    const raw = typeof jar?.value === "string" ? jar.value : undefined;
    await logoutSession(raw);
    jar?.remove();
    return ok({ ok: true });
  });
