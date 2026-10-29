import { strict as assert } from "node:assert";
import { and, asc, eq, like } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { safetyFindings, users } from "../src/db/schema/index.js";
import type { AuthContext } from "../src/auth/auth.types.js";
import {
  createFindingService,
  deleteFindingService,
  renumberWeekService,
  updateFindingService,
  type FindingInput,
} from "../src/modules/safety/safety.service.js";

// Line-walk numbering restarts at 1 every ISO week (Mon–Sun) of the inspection date.
// Runs the services against the local DB (no server needed):
//   cd apps/api && bun --env-file=../../.env scripts/verify-week-no.ts
// Uses far-future weeks and a temporary eps_admin; everything it creates is removed at the end.
const PROJECT = "11111111-1111-4111-8111-111111111111";
const TAG = "VERIFY-WEEK-NO";
const db = getDb();
const userId = crypto.randomUUID();
const auth = (role: "eps_admin" | "contractor"): AuthContext => ({
  user: { id: userId, email: "week-no-qa@example.test", displayName: "Week QA", role },
  identity: { method: "session" },
});

const WEEK_A = "2030-03-04"; // Monday
const WEEK_B = "2030-03-11";
const WEEK_C = "2030-03-18";
const input = (inspectionDate: string, label: string): FindingInput => ({
  observation: `${TAG} ${label}`,
  actionToBeTaken: "x",
  inspectionDate,
  status: "open",
  findingType: "unsafe_condition",
});
const weekNos = async (weekStart: string) =>
  (
    await db
      .select({ obs: safetyFindings.observation, no: safetyFindings.weekNo, date: safetyFindings.inspectionDate })
      .from(safetyFindings)
      .where(and(eq(safetyFindings.projectId, PROJECT), eq(safetyFindings.weekStart, weekStart), like(safetyFindings.observation, `${TAG}%`)))
      .orderBy(asc(safetyFindings.weekNo))
  ).map((r) => `${r.obs.slice(TAG.length + 1)}=${r.no}`);

try {
  await db.insert(users).values({ id: userId, email: "week-no-qa@example.test", role: "eps_admin", status: "active", displayName: "Week QA" });
  const eps = auth("eps_admin");

  // 1. numbers follow entry order inside a week and restart in the next one
  const wed = await createFindingService(eps, PROJECT, input("2030-03-06", "wed"));
  const mon = await createFindingService(eps, PROJECT, input("2030-03-04", "mon"));
  const fri = await createFindingService(eps, PROJECT, input("2030-03-08", "fri"));
  const b1 = await createFindingService(eps, PROJECT, input("2030-03-12", "b1"));
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "mon=2", "fri=3"]);
  assert.deepEqual(await weekNos(WEEK_B), ["b1=1"]);

  // 2. Sunday belongs to the week that started on Monday
  await createFindingService(eps, PROJECT, input("2030-03-10", "sun"));
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "mon=2", "fri=3", "sun=4"]);

  // 3. delete leaves a gap, the next finding takes max + 1
  await deleteFindingService(eps, PROJECT, mon.id);
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "fri=3", "sun=4"]);

  // 4. moving the date into another week = that week's next number; the old week keeps its numbers
  await updateFindingService(eps, PROJECT, fri.id, input("2030-03-13", "fri"));
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "sun=4"]);
  assert.deepEqual(await weekNos(WEEK_B), ["b1=1", "fri=2"]);

  // 5. editing inside the same week does not change the number
  await updateFindingService(eps, PROJECT, wed.id, input("2030-03-05", "wed"));
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "sun=4"]);

  // 6. renumber closes the gap and orders by inspection date (tue wed, then sun)
  const early = await createFindingService(eps, PROJECT, input("2030-03-04", "early"));
  assert.deepEqual(await weekNos(WEEK_A), ["wed=1", "sun=4", "early=5"]);
  const renumbered = await renumberWeekService(eps, PROJECT, "2030-03-07"); // any day of the week
  assert.deepEqual(renumbered, { weekStart: WEEK_A, count: 3 });
  assert.deepEqual(await weekNos(WEEK_A), ["early=1", "wed=2", "sun=3"]);
  assert.deepEqual(await weekNos(WEEK_B), ["b1=1", "fri=2"], "other weeks are untouched");

  // 7. only EPS staff can renumber
  await assert.rejects(renumberWeekService(auth("contractor"), PROJECT, WEEK_A));

  // 8. saves racing for the same number all succeed with distinct numbers
  await Promise.all(Array.from({ length: 8 }, (_, i) => createFindingService(eps, PROJECT, input("2030-03-19", `c${i}`))));
  const c = (await weekNos(WEEK_C)).map((s) => Number(s.split("=")[1])).sort((a, b) => a - b);
  assert.deepEqual(c, [1, 2, 3, 4, 5, 6, 7, 8]);

  void b1;
  void early;
  console.log("PASS week numbering: restart per ISO week, gaps, week move, renumber, role guard, concurrent creates");
} finally {
  await db.delete(safetyFindings).where(like(safetyFindings.observation, `${TAG}%`));
  await db.delete(users).where(eq(users.id, userId));
}
process.exit(0);
