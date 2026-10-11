import { strict as assert } from "node:assert";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { authRateLimits, contractorMemberships, passwordResetTokens, users } from "../src/db/schema/index.js";
import { hashSessionToken } from "../src/auth/session.service.js";

// Explicit local integration check; never run against hosted/canonical databases.
const database = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5432", "Local test database on :5432 required");
const base = "http://localhost:3000/api/v1";
const db = getDb();
const prefix = `qa${Date.now()}`;
const ids: string[] = [];
let passed = 0;
async function call(path: string, method = "GET", body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await response.json();
  return { status: response.status, json, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
function check(name: string, result: { status: number }, expected: number) {
  assert.equal(result.status, expected, `${name}: expected ${expected}, got ${result.status}`);
  console.log(`PASS ${name}: ${result.status}`); passed++;
}
const account = (suffix: string, other = false) => ({ email: `${prefix}${suffix}@example.test`, username: `${prefix}${suffix}`, password: "VerifyPass123!", ...(other ? { companyName: "AUTH V2 QA Other Company" } : { contractorId: "" }) });
async function findId(email: string) {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  assert(row); ids.push(row.id); return row.id;
}
try {
  const config = await call("/auth/config"); check("public config", config, 200);
  const options = await call("/auth/registration-options?pageSize=100"); check("public contractor options", options, 200);
  assert(options.json.data.length && options.json.data.every((o: Record<string, unknown>) => Object.keys(o).sort().join(",") === "code,id,name"));
  const contractorId = options.json.data[0].id as string;
  const input = { ...account("a"), contractorId };
  check("register", await call("/auth/register", "POST", input), 201);
  const id = await findId(input.email);
  check("duplicate email", await call("/auth/register", "POST", { ...input, username: `${prefix}dup` }), 409);
  check("duplicate username", await call("/auth/register", "POST", { ...input, email: `${prefix}dup@example.test` }), 409);
  check("missing company", await call("/auth/register", "POST", { ...input, contractorId: undefined }), 400);
  check("both company choices", await call("/auth/register", "POST", { ...input, companyName: "Other" }), 400);
  check("invalid email", await call("/auth/register", "POST", { ...input, email: "invalid" }), 400);
  check("invalid username", await call("/auth/register", "POST", { ...input, username: "invalid username" }), 400);
  check("short password", await call("/auth/register", "POST", { ...input, password: "short" }), 400);
  const validation = await call("/auth/register", "POST", { ...input, password: "SECRET_VALIDATION_PROBE".repeat(10) });
  check("credential-safe validation", validation, 400); assert(!JSON.stringify(validation.json).includes("SECRET_VALIDATION_PROBE"));
  check("unknown contractor", await call("/auth/register", "POST", { ...input, contractorId: crypto.randomUUID() }), 400);
  const pending = await call("/auth/login", "POST", { identifier: input.username, password: input.password }); check("pending login", pending, 403);
  assert.equal(pending.json.error.message, "บัญชีอยู่ระหว่างรอการอนุมัติ");
  check("pending wrong password", await call("/auth/login", "POST", { identifier: input.username, password: "WrongPass123!" }), 401);
  assert.equal((await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, id))).length, 0);
  const demo = await call("/auth/login", "POST", { email: "trial@sts.local", accessCode: process.env.DEMO_ACCESS_CODE }); check("legacy trial demo login", demo, 201);
  const eps = await call("/auth/login", "POST", { identifier: "eps", password: "sts123456" }); check("seeded EPS password login", eps, 201); assert(eps.cookie);
  check("approve", await call(`/users/${id}/approve`, "POST", {}, eps.cookie), 200);
  check("repeat approval", await call(`/users/${id}/approve`, "POST", {}, eps.cookie), 409);
  const memberships = await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, id)); assert.equal(memberships.length, 1); assert.equal(memberships[0]!.contractorId, contractorId);
  const login = await call("/auth/login", "POST", { identifier: input.email, password: input.password }); check("approved email login", login, 201); assert(login.cookie);
  const me = await call("/auth/me", "GET", undefined, login.cookie); check("session me", me, 200); assert.equal(me.json.data.user.id, id);
  check("username login", await call("/auth/login", "POST", { identifier: input.username.toUpperCase(), password: input.password }), 201);
  check("email payload with password", await call("/auth/login", "POST", { email: input.email, password: input.password }), 201);
  check("wrong password never selects demo", await call("/auth/login", "POST", { email: "trial@sts.local", password: "WrongPass123!" }), 401);
  const wrong = await call("/auth/login", "POST", { identifier: input.email, password: "WrongPass123!" }); check("wrong password", wrong, 401);
  const absent = await call("/auth/login", "POST", { identifier: `${prefix}missing`, password: "WrongPass123!" }); check("unknown login", absent, 401); assert.deepEqual(wrong.json, absent.json);
  check("password omission cannot bypass", await call("/auth/login", "POST", { email: input.email, accessCode: process.env.DEMO_ACCESS_CODE }), 401);
  check("non-EPS user list", await call("/users", "GET", undefined, login.cookie), 403);
  check("non-EPS approval", await call(`/users/${id}/approve`, "POST", {}, login.cookie), 403);
  check("non-EPS reset", await call(`/users/${id}/reset-password`, "POST", {}, login.cookie), 403);
  check("unauthenticated users list", await call("/users"), 401);
  const other = account("b", true); check("Other registration", await call("/auth/register", "POST", other), 201); const otherId = await findId(other.email);
  check("Other approval", await call(`/users/${otherId}/approve`, "POST", {}, eps.cookie), 200);
  assert.equal((await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, otherId))).length, 0);
  const [storedOther] = await db.select().from(users).where(eq(users.id, otherId)); assert.equal(storedOther!.requestedCompanyName, other.companyName);
  check("Other approved login", await call("/auth/login", "POST", { identifier: other.username, password: other.password }), 201);
  const rejected = account("c", true); check("second registration", await call("/auth/register", "POST", rejected), 201); const rejectedId = await findId(rejected.email);
  check("reject whitespace", await call(`/users/${rejectedId}/reject`, "POST", { reason: "  " }, eps.cookie), 400);
  check("reject", await call(`/users/${rejectedId}/reject`, "POST", { reason: "QA rejection reason" }, eps.cookie), 200);
  const denied = await call("/auth/login", "POST", { identifier: rejected.email, password: rejected.password }); check("rejected login", denied, 403); assert.equal(denied.json.error.message, "บัญชีถูกปฏิเสธ: QA rejection reason");
  check("rejected reset denied", await call(`/users/${rejectedId}/reset-password`, "POST", {}, eps.cookie), 409);
  const listing = await call(`/users?status=active&search=${prefix}&pageSize=1`, "GET", undefined, eps.cookie); check("paginated EPS list", listing, 200); assert.equal(listing.json.data.length, 1); assert.equal(listing.json.meta.total, 2); assert(!("passwordHash" in listing.json.data[0]));
  const first = await call(`/users/${id}/reset-password`, "POST", {}, eps.cookie); check("issue first reset link", first, 200);
  const second = await call(`/users/${id}/reset-password`, "POST", {}, eps.cookie); check("replace reset link", second, 200);
  const firstToken = new URL(first.json.data.url).searchParams.get("token");
  const token = new URL(second.json.data.url).searchParams.get("token")!;
  check("superseded token", await call("/auth/reset-password", "POST", { token: firstToken, password: "UpdatedPass123!" }), 400);
  const [storedToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashSessionToken(token))); assert(storedToken); assert.notEqual(storedToken.tokenHash, token);
  const race = await Promise.all([call("/auth/reset-password", "POST", { token, password: "UpdatedPass123!" }), call("/auth/reset-password", "POST", { token, password: "UpdatedPass123!" })]); assert.deepEqual(race.map((r) => r.status).sort(), [200, 400]); console.log("PASS concurrent reset: exactly one 200 and one 400"); passed++;
  check("used token", await call("/auth/reset-password", "POST", { token, password: "UpdatedPass123!" }), 400);
  check("old session revoked", await call("/auth/me", "GET", undefined, login.cookie), 401);
  check("old password rejected", await call("/auth/login", "POST", { identifier: input.email, password: input.password }), 401);
  check("new password login", await call("/auth/login", "POST", { identifier: input.email, password: "UpdatedPass123!" }), 201);
  const expiry = await call(`/users/${id}/reset-password`, "POST", {}, eps.cookie);
  const expiredToken = new URL(expiry.json.data.url).searchParams.get("token")!;
  await db.update(passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(and(eq(passwordResetTokens.userId, id), eq(passwordResetTokens.tokenHash, hashSessionToken(expiredToken))));
  check("expired token", await call("/auth/reset-password", "POST", { token: expiredToken, password: "UpdatedPass123!" }), 400);
  check("bad token", await call("/auth/reset-password", "POST", { token: "not-a-token", password: "UpdatedPass123!" }), 400);
  const concurrent = account("d", true); check("concurrent decision registration", await call("/auth/register", "POST", concurrent), 201); const concurrentId = await findId(concurrent.email);
  const decisions = await Promise.all([call(`/users/${concurrentId}/approve`, "POST", { contractorId }, eps.cookie), call(`/users/${concurrentId}/reject`, "POST", { reason: "QA race" }, eps.cookie)]);
  assert.deepEqual(decisions.map((r) => r.status).sort(), [200, 409]); console.log("PASS concurrent decision: exactly one 200 and one 409"); passed++;
  const normalized = { ...account("e", true), email: ` ${prefix.toUpperCase()}E@EXAMPLE.TEST `, username: ` ${prefix.toUpperCase()}E ` };
  check("normalized registration", await call("/auth/register", "POST", normalized), 201); await findId(normalized.email.trim().toLowerCase());
  const limitedId = `${prefix}limit`;
  for (let i = 0; i < 30; i++) assert.equal((await call("/auth/login", "POST", { identifier: limitedId, password: "WrongPass123!" })).status, 401);
  check("login throttling", await call("/auth/login", "POST", { identifier: limitedId, password: "WrongPass123!" }), 429);
  console.log(`AUTH V2: ${passed} checks passed`);
} finally {
  // Only the unique fixtures created by this invocation; cascades remove their sessions/tokens.
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
  const fixtureKeys = ["a", "b", "c", "d", "e", "missing", "limit"].flatMap((suffix) => [
    `login:${hashSessionToken(`${prefix}${suffix}`)}`, `login:${hashSessionToken(`${prefix}${suffix}@example.test`)}`,
  ]);
  await db.delete(authRateLimits).where(inArray(authRateLimits.key, fixtureKeys));
}
process.exit(0);
