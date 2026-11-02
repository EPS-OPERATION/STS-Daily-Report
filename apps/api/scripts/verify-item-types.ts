import { strict as assert } from "node:assert";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { coordinationItemTypes, projectContractors, users } from "../src/db/schema/index.js";
import { createSession } from "../src/auth/session.service.js";
import { getEnv } from "../src/config/env.js";

// Run inside the API container (or a host that can reach the API + DB):
//   docker compose exec -T api bun scripts/verify-item-types.ts
// Creates one temporary eps_admin and one temporary item type, checks CRUD + map payload, then removes them.
const PROJECT = "11111111-1111-4111-8111-111111111111";
const base = "http://localhost:3000/api/v1";
const db = getDb();
const userId = crypto.randomUUID();
const cookies = `${getEnv().SESSION_COOKIE_NAME}=`;

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, init);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

let createdId: string | null = null;
let originalIds: string[] = [];
let adminCookie: string | null = null;
try {
  await db.insert(users).values({
    id: userId,
    email: `item-type-qa-${Date.now()}@example.test`,
    role: "eps_admin",
    status: "active",
    displayName: "Item Type QA",
  });
  const session = await createSession(userId);
  const cookie = `${cookies}${session.token}`;
  adminCookie = cookie;
  const json = { "Content-Type": "application/json", Cookie: cookie };

  const list = await call(`/projects/${PROJECT}/coordination/item-types`, { headers: { Cookie: cookie } });
  assert.equal(list.response.status, 200, JSON.stringify(list.body));
  assert(Array.isArray(list.body.data));
  assert(list.body.data.some((t: { code: string }) => t.code === "crane"));
  originalIds = list.body.data.map((t: { id: string }) => t.id);
  const lastSort = Math.max(...list.body.data.map((t: { sortOrder: number }) => t.sortOrder));

  const code = `qa_${Date.now()}`;
  const created = await call(`/projects/${PROJECT}/coordination/item-types`, {
    method: "POST",
    headers: json,
    body: JSON.stringify({ code, label: "QA Type", labelTh: "ทดสอบประเภทงาน", iconKey: "hard-hat", sortOrder: 999 }),
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  createdId = created.body.data.id as string;
  assert.equal(created.body.data.code, code);
  assert(created.body.data.sortOrder > lastSort, "new type is appended last");

  const reordered = await call(`/projects/${PROJECT}/coordination/item-types/order`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ ids: [createdId, ...originalIds] }),
  });
  assert.equal(reordered.response.status, 200, JSON.stringify(reordered.body));
  assert.equal(reordered.body.data[0].id, createdId, "drag order is stored");

  const [link] = await db.select({ contractorId: projectContractors.contractorId }).from(projectContractors).where(eq(projectContractors.projectId, PROJECT)).limit(1);
  assert(link, "seeded project has a contractor");
  const itemInput = {
    contractorId: link.contractorId,
    workDate: "2026-10-20",
    title: "QA custom type",
    icon: code,
    x: 0.5, y: 0.5, rotation: 0,
    areaKind: "rectangle",
    geometry: { type: "polygon", points: [{ x: 0.4, y: 0.4 }, { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.5 }, { x: 0.4, y: 0.5 }] },
  };
  const item = await call(`/projects/${PROJECT}/coordination/items`, { method: "POST", headers: json, body: JSON.stringify(itemInput) });
  assert.equal(item.response.status, 201, JSON.stringify(item.body));
  const itemId = item.body.data.id as string;

  const map = await call(`/projects/${PROJECT}/coordination?date=2026-10-20`, { headers: { Cookie: cookie } });
  assert.equal(map.response.status, 200, JSON.stringify(map.body));
  assert(Array.isArray(map.body.data.itemTypes));
  assert(map.body.data.itemTypes.some((t: { code: string }) => t.code === "crane"));
  assert(map.body.data.items.some((v: { id: string; icon: string }) => v.id === itemId && v.icon === code));

  const removedItem = await call(`/projects/${PROJECT}/coordination/items/${itemId}?revision=1`, { method: "DELETE", headers: { Cookie: cookie } });
  assert.equal(removedItem.response.status, 204, JSON.stringify(removedItem.body));

  const updated = await call(`/projects/${PROJECT}/coordination/item-types/${createdId}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ label: "QA Type 2", labelTh: "ทดสอบ 2", iconKey: "warning", isActive: false }),
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.data.isActive, false);
  assert.equal(updated.body.data.iconKey, "warning");

  const hidden = await call(`/projects/${PROJECT}/coordination/items`, { method: "POST", headers: json, body: JSON.stringify({ ...itemInput, title: "Hidden type" }) });
  assert.equal(hidden.response.status, 400, JSON.stringify(hidden.body));

  const crane = list.body.data.find((t: { code: string }) => t.code === "crane");
  const blocked = await call(`/projects/${PROJECT}/coordination/item-types/${crane.id}`, { method: "DELETE", headers: { Cookie: cookie } });
  assert.equal(blocked.response.status, 409, JSON.stringify(blocked.body));

  const removed = await call(`/projects/${PROJECT}/coordination/item-types/${createdId}`, { method: "DELETE", headers: { Cookie: cookie } });
  assert.equal(removed.response.status, 204, JSON.stringify(removed.body));
  createdId = null;

  const restored = await call(`/projects/${PROJECT}/coordination/item-types/order`, {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ ids: originalIds }),
  });
  assert.equal(restored.response.status, 200, JSON.stringify(restored.body));
  assert.deepEqual(restored.body.data.map((t: { id: string }) => t.id), originalIds);

  console.log("PASS item types CRUD, append-last, drag order + map payload");
} finally {
  if (createdId) await db.delete(coordinationItemTypes).where(eq(coordinationItemTypes.id, createdId));
  // Best-effort: put the built-ins back in their original order if a check failed mid-way.
  if (originalIds.length && adminCookie) {
    await fetch(`${base}/projects/${PROJECT}/coordination/item-types/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ ids: originalIds }),
    }).catch(() => undefined);
  }
  await db.delete(users).where(eq(users.id, userId));
}
process.exit(0);
