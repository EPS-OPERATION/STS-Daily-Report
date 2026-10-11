import { strict as assert } from "node:assert";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { contractorMemberships, users } from "../src/db/schema/index.js";

// Explicit local integration check; never run against hosted/canonical databases.
const database = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5432", "Local test database on :5432 required");
const base = "http://localhost:3000/api/v1";
const db = getDb();
const prefix = `lk${Date.now()}`;
const email = `${prefix}@example.test`;
let passed = 0;
const ids: string[] = [];
async function call(path: string, method = "GET", body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await response.json();
  return { status: response.status, json, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}
function check(name: string, result: { status: number }, expected: number) {
  assert.equal(result.status, expected, `${name}: expected ${expected}, got ${result.status}`);
  console.log(`PASS ${name}: ${result.status}`); passed++;
}
try {
  const options = await call("/auth/registration-options?pageSize=100");
  check("contractor options", options, 200);
  const contractorId = options.json.data[0].id as string;
  check("register Other company", await call("/auth/register", "POST", { email, username: prefix, password: "VerifyPass123!", companyName: "Link QA Co" }), 201);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  assert(row); ids.push(row.id);
  const eps = await call("/auth/login", "POST", { identifier: "eps", password: "sts123456" });
  check("eps admin login", eps, 201);
  check("approve Other (no membership)", await call(`/users/${row.id}/approve`, "POST", {}, eps.cookie), 200);
  assert.equal((await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, row.id))).length, 0);
  const login = await call("/auth/login", "POST", { identifier: prefix, password: "VerifyPass123!" });
  check("approved unlinked login", login, 201);
  check("link request", await call("/auth/link-request", "POST", { contractorId }, login.cookie), 200);
  const pending = await call(`/users?status=pending&search=${prefix}`, "GET", undefined, eps.cookie);
  check("link request in pending queue", pending, 200);
  assert.equal(pending.json.data.length, 1);
  assert.equal(pending.json.data[0].status, "active");
  assert.equal(pending.json.data[0].membershipCount, 0);
  check("reject link request is blocked", await call(`/users/${row.id}/reject`, "POST", { reason: "nope" }, eps.cookie), 409);
  check("approve link", await call(`/users/${row.id}/approve`, "POST", {}, eps.cookie), 200);
  const memberships = await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, row.id));
  assert.equal(memberships.length, 1); assert.equal(memberships[0]!.contractorId, contractorId);
  check("second link request conflicts", await call("/auth/link-request", "POST", { contractorId }, login.cookie), 409);
  check("eps_site cannot access user management", await (async () => {
    const site = await call("/auth/login", "POST", { identifier: "eps-site", password: "sts123456" });
    assert.equal(site.status, 201, "eps-site login");
    return call("/users?status=pending", "GET", undefined, site.cookie);
  })(), 403);
  check("eps_site cannot approve users", await (async () => {
    const site = await call("/auth/login", "POST", { identifier: "eps-site", password: "sts123456" });
    assert.equal(site.status, 201, "eps-site login");
    return call(`/users/${row.id}/approve`, "POST", {}, site.cookie);
  })(), 403);
  console.log(`LINK REQUEST: ${passed} checks passed`);
} finally {
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
}
process.exit(0);
