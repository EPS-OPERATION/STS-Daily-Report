import { strict as assert } from "node:assert";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { authRateLimits, users } from "../src/db/schema/index.js";
import { hashSessionToken } from "../src/auth/session.service.js";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "5432");
const base = "http://localhost:3000/api/v1";
const db = getDb();
const name = `prodqa${Date.now()}`;
let id: string | undefined;
let bootstrapId: string | undefined;
let passed = 0;
async function call(path: string, expected: number, method = "GET", body?: unknown, cookie?: string) {
  const res = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json();
  assert.equal(res.status, expected, `${path}: ${JSON.stringify(json)}`);
  console.log(`PASS production ${method} ${path}: ${res.status}`); passed++;
  return { json, cookie: res.headers.get("set-cookie"), headers: res.headers };
}
try {
  const config = await call("/auth/config", 200); assert.equal(config.json.data.demoLoginEnabled, false);
  const options = await call("/auth/registration-options", 200); assert(options.json.data.length);
  await call("/contractors", 401);
  await call("/users", 401);
  await call("/auth/me", 401);
  await call("/auth/login", 401, "POST", { email: "trial@sts.local", accessCode: process.env.DEMO_ACCESS_CODE });
  const eps = await call("/auth/login", 201, "POST", { identifier: "eps", password: "sts123456" });
  assert(eps.cookie?.includes("HttpOnly") && eps.cookie.includes("Secure"));
  const cookie = eps.cookie.split(";")[0]!;
  const input = { email: `${name}@example.test`, username: name, password: "ProductionVerify123!", companyName: "AUTH V2 PRODUCTION QA" };
  await call("/auth/register", 201, "POST", input);
  const [created] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)); assert(created); id = created.id;
  await call(`/users/${id}/approve`, 200, "POST", {}, cookie);
  const login = await call("/auth/login", 201, "POST", { identifier: name, password: input.password });
  const reset = await call(`/users/${id}/reset-password`, 200, "POST", {}, cookie);
  assert.equal(reset.headers.get("cache-control"), "no-store");
  const token = new URL(reset.json.data.url).searchParams.get("token");
  await call("/auth/reset-password", 200, "POST", { token, password: "ChangedProduction123!" });
  await call("/auth/me", 401, "GET", undefined, login.cookie!.split(";")[0]);
  await call("/auth/login", 201, "POST", { identifier: name, password: "ChangedProduction123!" });
  const bootstrapEmail = `${name}admin@example.test`;
  const [admin] = await db.insert(users).values({ email: bootstrapEmail, role: "eps", status: "active" }).returning({ id: users.id });
  bootstrapId = admin!.id;
  const runBootstrap = async () => {
    const child = Bun.spawn([process.execPath, "apps/api/scripts/bootstrap-eps-password.ts"], {
      env: { ...process.env, EPS_BOOTSTRAP_EMAIL: bootstrapEmail, EPS_BOOTSTRAP_PASSWORD: "BootstrapVerify123!" },
      stdout: "pipe", stderr: "pipe",
    });
    await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return child.exited;
  };
  assert.equal(await runBootstrap(), 0); console.log("PASS production EPS bootstrap initializes a passwordless account"); passed++;
  await call("/auth/login", 201, "POST", { identifier: bootstrapEmail, password: "BootstrapVerify123!" });
  assert.equal(await runBootstrap(), 1); console.log("PASS production EPS bootstrap refuses to overwrite existing credentials"); passed++;
  console.log(`PRODUCTION AUTH V2: ${passed} checks passed`);
} finally {
  if (id) await db.delete(users).where(eq(users.id, id));
  if (bootstrapId) await db.delete(users).where(eq(users.id, bootstrapId));
  for (const identifier of [name, `${name}@example.test`, `${name}admin@example.test`]) {
    await db.delete(authRateLimits).where(eq(authRateLimits.key, `login:${hashSessionToken(identifier)}`));
  }
}
process.exit(0);
