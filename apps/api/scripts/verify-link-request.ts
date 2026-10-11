import { strict as assert } from "node:assert";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { contractorMemberships, projects, users } from "../src/db/schema/index.js";

// Explicit local integration check for project-scoped memberships and admin linking.
const database = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5432", "Local test database on :5432 required");
const base = "http://localhost:3000/api/v1";
const db = getDb();
const prefix = `lk${Date.now()}`;
const email = `${prefix}@example.test`;
const today = new Date().toISOString().slice(0, 10);
let passed = 0;
let tempProjectId: string | null = null;
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
  const [project] = await db.select({ id: projects.id }).from(projects).orderBy(projects.createdAt);
  assert(project);
  const empty = await call(`/auth/registration-options?pageSize=100&projectId=${crypto.randomUUID()}`);
  check("project filter (unknown project → empty)", empty, 200);
  assert.equal(empty.json.meta.total, 0);
  const filtered = await call(`/auth/registration-options?pageSize=100&projectId=${project.id}`);
  check("project filter (real project)", filtered, 200);
  assert.equal(filtered.json.meta.total, 23);
  const contractorId = filtered.json.data[0].id as string;
  const secondContractorId = filtered.json.data[1].id as string;

  check("register Other company", await call("/auth/register", "POST", { email, username: prefix, password: "VerifyPass123!", companyName: "Link QA Co" }), 201);
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  assert(row); ids.push(row.id);
  const eps = await call("/auth/login", "POST", { identifier: "eps", password: "sts123456" });
  check("eps admin login", eps, 201);
  check("approve Other (no membership)", await call(`/users/${row.id}/approve`, "POST", {}, eps.cookie), 200);
  assert.equal((await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, row.id))).length, 0);
  const login = await call("/auth/login", "POST", { identifier: prefix, password: "VerifyPass123!" });
  check("approved unlinked login", login, 201);

  check("link with a foreign project rejected", await call(`/users/${row.id}/link`, "POST", { contractorId, projectId: crypto.randomUUID() }, eps.cookie), 400);
  check("admin links contractor (project inferred)", await call(`/users/${row.id}/link`, "POST", { contractorId }, eps.cookie), 200);
  const [membership] = await db.select().from(contractorMemberships).where(eq(contractorMemberships.userId, row.id));
  assert(membership); assert.equal(membership.contractorId, contractorId); assert.equal(membership.projectId, project.id);
  const me = await call("/auth/me", "GET", undefined, login.cookie);
  check("me returns project-scoped membership", me, 200);
  assert(me.json.data.contractors.length === 1);
  assert.equal(me.json.data.contractors[0].projectId, project.id);
  check("second contractor in the same project conflicts", await call(`/users/${row.id}/link`, "POST", { contractorId: secondContractorId }, eps.cookie), 409);

  // Another project must not see the membership.
  tempProjectId = crypto.randomUUID();
  await db.insert(projects).values({ id: tempProjectId, code: `QA-${Date.now()}`, name: "QA Temp Project" });
  check("no membership in another project → 403", await call(`/projects/${tempProjectId}/daily-reports/current?date=${today}`, "GET", undefined, login.cookie), 403);

  check("eps_site cannot link users", await (async () => {
    const site = await call("/auth/login", "POST", { identifier: "eps-site", password: "sts123456" });
    assert.equal(site.status, 201, "eps-site login");
    return call(`/users/${row.id}/link`, "POST", { contractorId }, site.cookie);
  })(), 403);
  check("eps_site cannot access user management", await (async () => {
    const site = await call("/auth/login", "POST", { identifier: "eps-site", password: "sts123456" });
    assert.equal(site.status, 201, "eps-site login");
    return call("/users?status=pending", "GET", undefined, site.cookie);
  })(), 403);
  console.log(`USER LINK: ${passed} checks passed`);
} finally {
  if (tempProjectId) await db.delete(projects).where(eq(projects.id, tempProjectId));
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
}
process.exit(0);
