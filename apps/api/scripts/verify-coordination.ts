import { strict as assert } from "node:assert";
import { eq, inArray } from "drizzle-orm";
import { COORDINATION_MAX, COORDINATION_MIN, type CoordinationData, type CoordinationInput, type CoordinationItem } from "@sts/shared";
import { getDb } from "../src/db/client.js";
import { contractors, contractorMemberships, coordinationMaps, projectContractors, projects, users } from "../src/db/schema/index.js";
import { createSession } from "../src/auth/session.service.js";
import { getEnv } from "../src/config/env.js";

const database = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5432", "Only the local QA database is permitted");
const db = getDb();
const prefix = `ZZMAPQA${Date.now()}`;
const projectIds = [crypto.randomUUID(), crypto.randomUUID()];
const contractorIds = [crypto.randomUUID(), crypto.randomUUID()];
const userIds = Array.from({ length: 6 }, () => crypto.randomUUID());
let checks = 0;
async function call<T>(path: string, expected: number, method = "GET", input?: unknown, cookie?: string) {
  const response = await fetch(`http://localhost:3000/api/v1${path}`, { method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: input === undefined ? undefined : JSON.stringify(input) });
  const body = response.status === 204 ? null : await response.json() as { data: T; error?: { message: string } };
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(body)}`);
  checks++; console.log(`PASS ${method} ${path.replace(projectIds[0]!, "QA-project")}: ${response.status}`);
  return body?.data as T;
}
try {
  await db.insert(projects).values(projectIds.map((id, index) => ({ id, code: `${prefix}${index}`, name: `Coordination QA ${index}` })));
  await db.insert(contractors).values(contractorIds.map((id, index) => ({ id, code: `${prefix}${index}`, name: `Coordination QA contractor ${index}` })));
  await db.insert(projectContractors).values([
    { projectId: projectIds[0]!, contractorId: contractorIds[0]! }, { projectId: projectIds[0]!, contractorId: contractorIds[1]! },
    { projectId: projectIds[1]!, contractorId: contractorIds[0]! },
  ]);
  await db.insert(coordinationMaps).values(projectIds.map((projectId) => ({ projectId, imagePath: "/site-plan/STS_KY_Layout_Plan.png", width: 6542, height: 4951 })));
  await db.insert(users).values(userIds.map((id, index) => ({ id, email: `${prefix.toLowerCase()}${index}@example.test`, role: index === 0 ? "eps_admin" : index === 1 ? "eps_site" : "contractor", status: "active" })));
  await db.insert(contractorMemberships).values([
    { projectId: projectIds[0]!, userId: userIds[2]!, contractorId: contractorIds[0]! },
    { projectId: projectIds[0]!, userId: userIds[3]!, contractorId: contractorIds[0]! },
    { projectId: projectIds[0]!, userId: userIds[4]!, contractorId: contractorIds[1]! },
    { projectId: projectIds[1]!, userId: userIds[5]!, contractorId: contractorIds[0]! },
  ]);
  const sessions = await Promise.all(userIds.map((id) => createSession(id)));
  const cookies = sessions.map((s) => `${getEnv().SESSION_COOKIE_NAME}=${s.token}`);
  const base = `/projects/${projectIds[0]}/coordination`;
  const date = "2026-10-12";
  await call(`${base}?date=${date}`, 401);
  await call(`${base}?date=${date}`, 403, "GET", undefined, cookies[5]);
  const initial = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[2]);
  assert.equal(initial.items.length, 0); assert.deepEqual(initial.editableContractorIds, [contractorIds[0]]); assert.equal(initial.canManageColors, false);
  assert(initial.contractors.every((c) => /^#[0-9A-F]{6}$/.test(c.color)));
  const staff = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[1]);
  assert.equal(staff.editableContractorIds.length, 2); assert.equal(staff.canManageColors, true);
  const input: CoordinationInput = { contractorId: contractorIds[0]!, workDate: date, title: "AUTHORISED QA crane 25T", icon: "crane", x: 0.25, y: 0.4, rotation: 30, areaKind: "rectangle",
    geometry: { type: "polygon", points: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.1 }, { x: 0.3, y: 0.3 }, { x: 0.1, y: 0.3 }] } };
  await call(`${base}/items`, 403, "POST", { ...input, contractorId: contractorIds[1] }, cookies[2]);
  await call(`${base}/items`, 400, "POST", { ...input, workDate: "2026-02-30" }, cookies[2]);
  await call(`${base}/items`, 400, "POST", { ...input, x: COORDINATION_MAX + 0.05 }, cookies[2]);
  await call(`${base}/items`, 400, "POST", { ...input, y: COORDINATION_MIN - 0.05 }, cookies[2]);
  await call(`${base}/items`, 400, "POST", { ...input, areaKind: "polygon", geometry: { type: "polygon", points: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.3 }, { x: 0.1, y: 0.3 }, { x: 0.3, y: 0.1 }] } }, cookies[2]);
  await call(`${base}/items`, 400, "POST", { ...input, geometry: { type: "polygon", points: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.1 }, { x: 0.2, y: 0.3 }, { x: 0.1, y: 0.3 }] } }, cookies[2]);
  const item = await call<CoordinationItem>(`${base}/items`, 201, "POST", input, cookies[2]);
  assert.equal(item.revision, 1);
  const sameCompany = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[3]);
  assert.deepEqual(sameCompany.items[0]!.geometry, input.geometry); assert.equal(sameCompany.items[0]!.x, input.x);
  const otherCompany = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[4]); assert.equal(otherCompany.items.length, 1);
  const tomorrow = await call<CoordinationData>(`${base}?date=2026-10-13`, 200, "GET", undefined, cookies[2]); assert.equal(tomorrow.items.length, 0);
  await call(`${base}/items/${item.id}`, 403, "PATCH", { ...input, revision: 1 }, cookies[4]);
  await call(`${base}/items/${item.id}`, 403, "PATCH", { ...input, revision: 1 }, cookies[5]);
  const updated = await call<CoordinationItem>(`${base}/items/${item.id}`, 200, "PATCH", { ...input, title: "Colleague update", x: 0.45, revision: 1 }, cookies[3]); assert.equal(updated.revision, 2);
  await call(`${base}/items/${item.id}`, 409, "PATCH", { ...input, revision: 1 }, cookies[2]);
  const race = await Promise.all([0, 1].map((n) => fetch(`http://localhost:3000/api/v1${base}/items/${item.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: cookies[2]! }, body: JSON.stringify({ ...input, title: `QA concurrent ${n}`, revision: 2 }),
  })));
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]); console.log("PASS concurrent revision update: exactly one 200 and one 409"); checks++;
  const second = await call<CoordinationItem>(`${base}/items`, 201, "POST", { ...input, contractorId: contractorIds[1], icon: "truck", areaKind: "polygon", title: "Overlapping QA work" }, cookies[4]);
  const overlap = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[0]); assert.equal(overlap.items.length, 2);
  const company = overlap.contractors.find((c) => c.id === contractorIds[0])!;
  await call(`${base}/contractors/${company.id}`, 403, "PATCH", { color: "#7E22CE", revision: company.revision }, cookies[2]);
  await call(`${base}/contractors/${company.id}`, 200, "PATCH", { color: "#7E22CE", revision: company.revision }, cookies[1]);
  await call(`${base}/contractors/${company.id}`, 409, "PATCH", { color: "#15803D", revision: company.revision }, cookies[0]);
  const recolored = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[4]); assert.equal(recolored.contractors.find((c) => c.id === company.id)!.color, "#7E22CE");
  await call(`${base}/items/${item.id}?revision=3`, 403, "DELETE", undefined, cookies[4]);
  await call(`${base}/items/${item.id}?revision=2`, 409, "DELETE", undefined, cookies[2]);
  await call(`${base}/items/${item.id}?revision=3`, 204, "DELETE", undefined, cookies[3]);
  await call(`${base}/items/${second.id}?revision=1`, 204, "DELETE", undefined, cookies[0]);
  const empty = await call<CoordinationData>(`${base}?date=${date}`, 200, "GET", undefined, cookies[2]); assert.equal(empty.items.length, 0);
  console.log(`COORDINATION: ${checks} actual API checks passed; project/company scope, geometry, date, overlap, colours, revision and cleanup verified`);
} finally {
  // Only entities whose exact generated IDs belong to this invocation.
  await db.delete(projects).where(inArray(projects.id, projectIds));
  await db.delete(users).where(inArray(users.id, userIds));
  await db.delete(contractors).where(inArray(contractors.id, contractorIds));
}
process.exit(0);
