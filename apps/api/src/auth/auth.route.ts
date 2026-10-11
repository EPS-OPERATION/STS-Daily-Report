import { timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { normalizePagination } from "@sts/shared";
import { InvalidLoginError } from "@/shared/errors/app-error.js";
import { getEnv } from "@/config/env.js";
import { ok, paginated } from "@/shared/http/response.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { demoLoginEnabled, limitAuthAttempts, loadMe, loginWithEmail, loginWithPassword, logoutSession, registerUser, registrationOptions, requestContractorLink } from "./auth.service.js";
import { linkRequestBody, loginBody, registerBody, resetPasswordBody } from "./auth.schema.js";
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

// Hosted demo: the email login also needs the shared access code (DEMO_ACCESS_CODE).
function accessCodeOk(given: string | undefined): boolean {
  const expected = getEnv().DEMO_ACCESS_CODE;
  if (!expected) return true;
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .onAfterHandle(({ set }) => { set.headers["cache-control"] = "no-store"; })
  // Public: tells the login page whether to show the access-code box.
  .get("/config", () => ok({ accessCodeRequired: Boolean(getEnv().DEMO_ACCESS_CODE), demoLoginEnabled: demoLoginEnabled(), allowResubmit: getEnv().ALLOW_RESUBMIT }))
  .get("/registration-options", async ({ query }) => {
    const p = normalizePagination(query);
    const { rows, total } = await registrationOptions(p);
    return paginated(rows, p.page, p.pageSize, total);
  }, { query: listContractorsQuery })
  .post("/register", async ({ body, set, server, request }) => {
    await limitAuthAttempts("register", server?.requestIP(request)?.address ?? "unknown", 100);
    const result = await registerUser(body);
    set.status = 201;
    return ok(result);
  }, { body: registerBody })
  .post("/reset-password", async ({ body, server, request }) => {
    await limitAuthAttempts("reset", server?.requestIP(request)?.address ?? "unknown", 60);
    return ok(await resetPassword(body.token, body.password));
  }, { body: resetPasswordBody })
  .post("/login", async ({ body, cookie, set }) => {
    const identifier = "identifier" in body ? body.identifier : body.email;
    await limitAuthAttempts("login", identifier.trim().toLowerCase(), 30);
    if (!("password" in body) && !accessCodeOk(body.accessCode)) throw new InvalidLoginError("Email or access code is not valid.");
    const { context, token, expiresAt } = "password" in body
      ? await loginWithPassword(identifier, body.password)
      : await loginWithEmail(body.email);
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
  }, { body: loginBody })
  .use(requireAuth)
  .get("/me", async ({ auth }) => {
    return loadMe({ userId: auth.user.id, email: auth.user.email, method: auth.identity.method });
  })
  .post("/link-request", async ({ auth, body }) => ok(await requestContractorLink(auth, body.contractorId)), { body: linkRequestBody })
  .post("/logout", async ({ cookie }) => {
    const jar = cookieJar(cookie as Record<string, { value?: unknown } | undefined>);
    const raw = typeof jar?.value === "string" ? jar.value : undefined;
    await logoutSession(raw);
    jar?.remove();
    return ok({ ok: true });
  });
