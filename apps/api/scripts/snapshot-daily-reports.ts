// Characterization snapshot for the daily-reports API surface, used to prove a refactor is behaviour-preserving:
//   bun --env-file=../../.env scripts/snapshot-daily-reports.ts test/golden/daily-reports.snapshot.json --check
//   (without --check it (re)writes the file: do that only when a response change is intended)
// Drives the real app in-process against the local DB with an isolated QA project (removed afterwards).
import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import { like, inArray } from "drizzle-orm";
import { API_PREFIX } from "../src/config/constants.js";
import { getEnv } from "../src/config/env.js";
import { buildApp } from "../src/app.js";
import { createSession } from "../src/auth/session.service.js";
import { getDb } from "../src/db/client.js";
import { buildings, contractorMemberships, dailyReports, inspectionRequests, contractors, projectContractors, projects, users } from "../src/db/schema/index.js";

const database = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(database.hostname), "Only the local QA database is permitted");
const out = process.argv[2];
assert(out, "usage: snapshot-daily-reports.ts <out.json>");

const db = getDb();
const app = buildApp();
const prefix = `ZZSNAP${Date.now()}`;
const projectId = crypto.randomUUID();
const contractorId = crypto.randomUUID();
const userIds = [crypto.randomUUID(), crypto.randomUUID()];
const buildingIds = [crypto.randomUUID(), crypto.randomUUID()];
const DATE = "2026-03-10";
const NEXT = "2026-03-11";

// Stable output: UUIDs -> u1,u2.. by first appearance, ISO timestamps -> <ts>, QA prefix -> <qa>.
const uuids = new Map<string, string>();
const normalize = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (m) => {
        if (!uuids.has(m)) uuids.set(m, `u${uuids.size + 1}`);
        return uuids.get(m)!;
      })
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})/g, "<ts>")
      .replaceAll(prefix.toLowerCase(), "<qa>")
      .replaceAll(prefix, "<qa>"),
  );

const snapshot: Record<string, unknown> = {};
let cookies: Record<"eps" | "contractor", string>;
async function call(name: string, method: string, path: string, who?: "eps" | "contractor", body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${API_PREFIX}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(who ? { Cookie: cookies[who] } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  snapshot[name] = { status: response.status, body: normalize(parsed) };
  if (process.env.SNAP_DEBUG && response.status >= 400) console.log(text.slice(0, 400));
  console.log(`${response.status} ${method} ${path.split("?")[0].replace(projectId, "<project>")}`);
  return parsed as { data?: any; error?: unknown };
}

const crew = (extra: object = {}) => ({
  discipline: "CE", positions: [{ position: "foreman", headcount: 2 }, { position: "worker", headcount: 6 }],
  thaiMale: 6, thaiFemale: 1, foreignMale: 1, foreignFemale: 0, ...extra,
});

try {
  await db.insert(projects).values({ id: projectId, code: prefix, name: `Snapshot QA ${prefix}` });
  await db.insert(contractors).values({ id: contractorId, code: prefix, name: `Snapshot QA contractor ${prefix}` });
  await db.insert(projectContractors).values({ projectId, contractorId });
  await db.insert(buildings).values(buildingIds.map((id, i) => ({ id, projectId, code: `ZQ${i}`, name: `QA building ${i}`, sortOrder: i })));
  await db.insert(users).values([
    { id: userIds[0]!, email: `${prefix.toLowerCase()}-eps@example.test`, role: "eps_admin", status: "active" },
    { id: userIds[1]!, email: `${prefix.toLowerCase()}-ctr@example.test`, role: "contractor", status: "active" },
  ]);
  await db.insert(contractorMemberships).values({ projectId, userId: userIds[1]!, contractorId });
  const [eps, ctr] = await Promise.all(userIds.map((id) => createSession(id)));
  const cookie = getEnv().SESSION_COOKIE_NAME;
  cookies = { eps: `${cookie}=${eps!.token}`, contractor: `${cookie}=${ctr!.token}` };
  const base = `/projects/${projectId}`;

  await call("current-unauth", "GET", `${base}/daily-reports/current?date=${DATE}&contractorId=${contractorId}`);
  await call("draft", "POST", `${base}/daily-reports/draft`, "contractor", { date: DATE, contractorId });
  await call("morning-invalid", "PUT", `${base}/daily-reports/morning`, "contractor", { date: DATE });
  await call("morning", "PUT", `${base}/daily-reports/morning`, "contractor", {
    date: DATE, contractorId, startTime: "08:00", endTime: "17:00", workHours: 8, weather: "normal", temperatureC: 33, humidityPct: 60,
    equipment: [{ equipmentType: "Welding machine", qty: 2 }],
    crews: [crew({ allocations: [
      { buildingId: buildingIds[0], headcount: 5, workDescription: "Rebar tying", startTime: "08:00", endTime: "12:00", planPercent: 40 },
      { buildingId: buildingIds[1], headcount: 3, workDescription: "Formwork", planPercent: 60 },
    ] })],
    permits: [{ buildingId: buildingIds[0], permitType: "hot_work", workers: 4, highRisk: true, taskName: "Welding", supervisorName: "QA Sup" }],
  });
  const current = await call("current-after-morning", "GET", `${base}/daily-reports/current?date=${DATE}&contractorId=${contractorId}`, "contractor");
  const allocations: { id: string }[] = current.data?.allocations ?? current.data?.report?.allocations ?? [];
  assert(allocations.length > 0, "could not find allocation ids in /current response — adjust script to the response shape");
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const evening = {
    date: DATE, contractorId, otHours: 2,
    overtime: [{ buildingId: buildingIds[0], task: "Pour prep", workers: 3, hours: 2 }],
    accidentOccurred: false,
    crews: [crew()],
    progress: allocations.map((a, i) => ({ allocationId: a.id, actualPercent: i === 0 ? 20 : 70, ...(i === 0 ? { countermeasure: "Add crew tomorrow" } : {}) })),
    signatureName: "QA Foreman", signatureData: png,
    machinery: [{ buildingId: buildingIds[0], machineType: "Mobile Crane 25T", unitTag: "C-1", startTime: "08:00", endTime: "12:00", purpose: "Lift rebar" }],
    equipmentRequests: [{ buildingId: buildingIds[1], equipmentType: "Scaffold", qty: 10, purpose: "Access" }],
    permits: [{ buildingId: buildingIds[1], permitType: "height", workers: 3 }],
    roadUsage: [{ roadLocation: "Main road A", startTime: "09:00", endTime: "11:00", purpose: "Concrete delivery", buildingId: buildingIds[0] }],
    forecasts: [{ buildingId: buildingIds[0], description: "Pour slab" }],
    materials: [{ name: "Rebar 12mm", qty: 120, unit: "pcs" }],
  };
  await call("evening-invalid", "PUT", `${base}/daily-reports/evening`, "contractor", { ...evening, forecasts: [] });
  const evened = await call("evening", "PUT", `${base}/daily-reports/evening`, "contractor", evening);
  const reportId: string | undefined = evened.data?.id ?? evened.data?.report?.id ?? current.data?.id ?? current.data?.report?.id;
  assert(reportId, "no report id found");
  const after = await call("current-after-evening", "GET", `${base}/daily-reports/current?date=${DATE}&contractorId=${contractorId}`, "contractor");
  const roadId: string | undefined = after.data?.roadUsage?.[0]?.id ?? after.data?.report?.roadUsage?.[0]?.id;

  await call("review-queue", "GET", `${base}/daily-reports/review-queue?date=${DATE}`, "eps");
  await call("review-queue-contractor", "GET", `${base}/daily-reports/review-queue?date=${DATE}`, "contractor");
  await call("print-eps", "GET", `/daily-reports/${reportId}/print`, "eps");
  await call("print-contractor", "GET", `/daily-reports/${reportId}/print`, "contractor");
  if (roadId) {
    await call("road-adjust-contractor", "PATCH", `${base}/daily-reports/road-usage/${roadId}`, "contractor", { startTime: "09:30", endTime: "10:30" });
    await call("road-adjust-eps", "PATCH", `${base}/daily-reports/road-usage/${roadId}`, "eps", { startTime: "09:30", endTime: "10:30" });
  }
  await call("review-reject-no-note", "POST", `/daily-reports/${reportId}/review`, "eps", { decision: "rejected" });
  await call("review-approve", "POST", `/daily-reports/${reportId}/review`, "eps", { decision: "approved", note: "ok" });

  await call("weekly-summary", "GET", `${base}/weekly-summary?weekStart=2026-03-09`);
  await call("position-mix", "GET", `${base}/position-mix?from=2026-03-01&to=2026-03-31`);
  await call("daily-requests", "GET", `${base}/daily-requests?from=${DATE}&to=${NEXT}`);
  await call("materials", "GET", `${base}/daily-reports/materials?from=2026-03-01&to=2026-03-31`);
  await call("site-day", "GET", `${base}/site-day?date=${DATE}`);
  await call("site-day-range", "GET", `${base}/site-day?from=${DATE}&to=${NEXT}`);
  await call("manpower-summary", "GET", `${base}/manpower-summary?from=2026-03-01&to=2026-03-31`);
  await call("manpower-trend", "GET", `${base}/manpower-trend?until=2026-03-31&weeks=4`);

  const text = JSON.stringify(snapshot, null, 2);
  if (process.argv.includes("--check")) {
    const same = readFileSync(out!, "utf8").split("\r\n").join("\n") === text;
    console.log(same ? `OK: ${Object.keys(snapshot).length} calls match ${out}` : `MISMATCH against ${out}`);
    if (!same) process.exitCode = 1;
  } else {
    writeFileSync(out!, text);
    console.log(`wrote ${out} (${Object.keys(snapshot).length} calls)`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  // Sweep this and any earlier aborted runs (reports first: they restrict-reference buildings).
  const qaProjects = db.select({ id: projects.id }).from(projects).where(like(projects.code, "ZZSNAP%"));
  await db.delete(inspectionRequests).where(inArray(inspectionRequests.projectId, qaProjects));
  await db.delete(dailyReports).where(inArray(dailyReports.projectId, qaProjects));
  await db.delete(contractorMemberships).where(inArray(contractorMemberships.projectId, qaProjects));
  await db.delete(projects).where(like(projects.code, "ZZSNAP%"));
  await db.delete(contractors).where(like(contractors.code, "ZZSNAP%"));
  await db.delete(users).where(like(users.email, "zzsnap%"));
  process.exit(process.exitCode ?? 0);
}
