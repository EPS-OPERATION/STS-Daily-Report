import { type PermitType, REQUEST_STATUSES, type RequestStatus, addDays, attendanceOf, mondayOf, normalizePagination, round1, workloadLevel } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { findMachineryConflicts, findRoadConflicts } from "@/modules/daily-requests/daily-request.conflicts.js";
import { listBookingsInRange, listEquipmentRequestsInRange, listPermitsInRange, listRoadUsageInRange } from "@/modules/daily-requests/daily-request.repository.js";
import { listRequests } from "@/modules/inspection-requests/inspection-request.repository.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { assertRange } from "@/shared/date-range.js";
import { countMaterialsLog, countRequestsByStatusInRange, listAllocationDetailsInRange, listAllocationsInRange, listMaterialsLog, listPositionsInRange, listReportHoursInRange, summarizeMaterials } from "./report-summary.repository.js";

// EPS view of what contractors reported on site (open read, like weekly summary).
export async function materialsService(
  projectId: string,
  query: { from?: string; to?: string; search?: string; contractorId?: string; page?: string; pageSize?: string },
) {
  const db = getDb();
  await assertProject(projectId);
  const p = normalizePagination(query as Record<string, unknown>);
  const filter = {
    from: query.from,
    to: query.to,
    search: query.search?.trim() || undefined,
    contractorId: query.contractorId,
  };
  const [rows, total, summary] = await Promise.all([
    listMaterialsLog(db, projectId, { ...filter, limit: p.pageSize, offset: (p.page - 1) * p.pageSize }),
    countMaterialsLog(db, projectId, filter),
    summarizeMaterials(db, projectId, filter),
  ]);
  return {
    data: rows.map((r) => ({ ...r, qty: Number(r.qty) })),
    summary,
    meta: { page: p.page, pageSize: p.pageSize, total },
  };
}

// ---- photos ----------------------------------------------------------------

export async function weeklySummaryService(projectId: string, weekStartInput: string) {
  const db = getDb();
  await assertProject(projectId);
  const weekStart = mondayOf(weekStartInput);
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [buildings, allocations, permits, bookings, hours, requestCounts, roads, equipmentRequests] = await Promise.all([
    listBuildings(db, projectId),
    listAllocationsInRange(db, projectId, weekStart, weekEnd),
    listPermitsInRange(db, projectId, weekStart, weekEnd),
    listBookingsInRange(db, projectId, weekStart, weekEnd),
    listReportHoursInRange(db, projectId, weekStart, weekEnd),
    countRequestsByStatusInRange(db, projectId, weekStart, weekEnd),
    listRoadUsageInRange(db, projectId, weekStart, weekEnd),
    listEquipmentRequestsInRange(db, projectId, weekStart, weekEnd),
  ]);
  const roadClashes = new Set(findRoadConflicts(roads).flatMap((c) => c.ids));

  type Cell = {
    date: string;
    headcount: number;
    contractors: Map<string, { id: string; code: string; name: string; headcount: number }>;
    permits: Map<string, number>;
  };
  const cells = new Map<string, Cell>();
  const cellOf = (buildingId: string, date: string) => {
    const key = `${buildingId}|${date}`;
    let c = cells.get(key);
    if (!c) {
      c = { date, headcount: 0, contractors: new Map(), permits: new Map() };
      cells.set(key, c);
    }
    return c;
  };

  // Man-days: people × share of the day they spent in that building (crews that move count once).
  for (const a of allocations) {
    const c = cellOf(a.buildingId, a.reportDate);
    const manDays = a.headcount * a.dayShare;
    c.headcount = round1(c.headcount + manDays);
    const prev = c.contractors.get(a.contractorId);
    c.contractors.set(a.contractorId, {
      id: a.contractorId,
      code: a.contractorCode,
      name: a.contractorName,
      headcount: round1((prev?.headcount ?? 0) + manDays),
    });
  }
  for (const p of permits) {
    const c = cellOf(p.buildingId, p.targetDate);
    c.permits.set(p.permitType, (c.permits.get(p.permitType) ?? 0) + p.workers);
  }

  const rows = buildings.map((b) => {
    const dayCells = days.map((date) => {
      const c = cells.get(`${b.id}|${date}`);
      const contractors = c ? [...c.contractors.values()].sort((x, y) => y.headcount - x.headcount) : [];
      const headcount = c?.headcount ?? 0;
      return {
        date,
        headcount,
        contractors,
        permits: c ? [...c.permits.entries()].map(([type, workers]) => ({ type: type as PermitType, workers })) : [],
        level: workloadLevel(headcount, contractors.length),
      };
    });
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      nameTh: b.nameTh,
      weekManDays: round1(dayCells.reduce((s, c) => s + c.headcount, 0)),
      peakHeadcount: Math.max(0, ...dayCells.map((c) => c.headcount)),
      cells: dayCells,
    };
  });

  const conflicts = findMachineryConflicts(bookings);
  const conflicted = new Map<string, "conflict" | "possible">();
  for (const c of conflicts) {
    for (const id of c.bookingIds) {
      if (conflicted.get(id) !== "conflict") conflicted.set(id, c.severity);
    }
  }

  return {
    weekStart,
    weekEnd,
    days,
    buildings: rows,
    machinery: bookings.map((b) => ({ ...b, conflict: conflicted.get(b.id) ?? null })),
    conflicts,
    roads: roads.map((r) => ({ ...r, conflict: roadClashes.has(r.id) })),
    equipmentRequests,
    requests: Object.fromEntries(
      REQUEST_STATUSES.map((st) => [st, requestCounts.find((r) => r.status === st)?.n ?? 0]),
    ) as Record<RequestStatus, number>,
    totals: {
      manDays: rows.reduce((s, r) => s + r.weekManDays, 0),
      // Reports without hours (older rows) contribute 0 rather than a guess.
      manHours: hours.reduce(
        (s, h) => round1(s + attendanceOf(h).manHours),
        0,
      ),
      permitWorkers: permits.reduce((s, p) => s + p.workers, 0),
      bookings: bookings.length,
      conflicts: conflicts.filter((c) => c.severity === "conflict").length,
      possibleConflicts: conflicts.filter((c) => c.severity === "possible").length,
      roadConflicts: roadClashes.size,
    },
  };
}

export type WeeklySummary = Awaited<ReturnType<typeof weeklySummaryService>>;

// ---- charts ------------------------------------------------------------------

export async function positionMixService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const rows = await listPositionsInRange(db, projectId, from, to);
  const days = new Map<string, Set<string>>();
  const sums = new Map<string, { contractorId: string; contractorCode: string; position: string; total: number }>();
  for (const r of rows) {
    (days.get(r.contractorId) ?? days.set(r.contractorId, new Set()).get(r.contractorId)!).add(r.reportDate);
    const key = `${r.contractorId}|${r.position}`;
    const cur = sums.get(key) ?? { contractorId: r.contractorId, contractorCode: r.contractorCode, position: r.position, total: 0 };
    cur.total += r.headcount;
    sums.set(key, cur);
  }
  return [...sums.values()].map((s) => ({
    contractorId: s.contractorId,
    contractorCode: s.contractorCode,
    position: s.position,
    totalHeadcount: s.total,
    avgPerDay: s.total,
  }));
}

// Average daily manpower per week for the last `weeks` weeks up to `until` (deck: "Avg. Manday movement").
// Average is over days that have at least one submitted morning report.
export async function manpowerTrendService(projectId: string, until: string, weeks: number) {
  const db = getDb();
  await assertProject(projectId);
  const lastWeek = mondayOf(until);
  const firstWeek = addDays(lastWeek, -7 * (weeks - 1));
  const rows = await listReportHoursInRange(db, projectId, firstWeek, addDays(lastWeek, 6));
  const byDay = new Map<string, number>();
  for (const r of rows) {
    byDay.set(r.reportDate, round1((byDay.get(r.reportDate) ?? 0) + attendanceOf(r).manDays));
  }
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(firstWeek, i * 7);
    const daily = Array.from({ length: 7 }, (_, d) => byDay.get(addDays(weekStart, d))).filter((n): n is number => n !== undefined);
    const manDays = daily.reduce((s, n) => s + n, 0);
    return {
      weekStart,
      weekEnd: addDays(weekStart, 6),
      reportedDays: daily.length,
      manDays,
      // null (not 0) when nobody reported — the chart shows a gap, not a false drop.
      avgDaily: daily.length ? Math.round(manDays / daily.length) : null,
    };
  });
}

// Manpower page: per-contractor totals (man-days, NMH, nationality/sex) and the
// per-day headcount behind the stacked chart. Headcount = morning nationality split.
export async function manpowerSummaryService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [rows, allocations, buildingList] = await Promise.all([
    listReportHoursInRange(db, projectId, from, to),
    listAllocationsInRange(db, projectId, from, to),
    listBuildings(db, projectId),
  ]);
  const byContractor = new Map<
    string,
    { contractorId: string; contractorCode: string; manDays: number; manHours: number; reportedDays: number; thaiMale: number; thaiFemale: number; foreignMale: number; foreignFemale: number }
  >();
  const daily: { date: string; contractorCode: string; headcount: number }[] = [];
  for (const r of rows) {
    const { manDays: headcount, manHours: hours } = attendanceOf(r);
    const c = byContractor.get(r.contractorId) ?? {
      contractorId: r.contractorId,
      contractorCode: r.contractorCode,
      manDays: 0,
      manHours: 0,
      reportedDays: 0,
      thaiMale: 0,
      thaiFemale: 0,
      foreignMale: 0,
      foreignFemale: 0,
    };
    c.manDays = round1(c.manDays + headcount);
    c.manHours = round1(c.manHours + hours);
    c.reportedDays += 1;
    c.thaiMale += r.thaiMale;
    c.thaiFemale += r.thaiFemale;
    c.foreignMale += r.foreignMale;
    c.foreignFemale += r.foreignFemale;
    byContractor.set(r.contractorId, c);
    daily.push({ date: r.reportDate, contractorCode: r.contractorCode, headcount });
  }
  const contractors = [...byContractor.values()].sort((a, b) => b.manDays - a.manDays);
  const days = new Set(rows.map((r) => r.reportDate)).size;
  // Man-days per building (site order), split by contractor — from the morning allocation.
  const perBuilding = new Map<string, Map<string, number>>();
  for (const a of allocations) {
    const m = perBuilding.get(a.buildingId) ?? new Map<string, number>();
    m.set(a.contractorCode, round1((m.get(a.contractorCode) ?? 0) + a.headcount * a.dayShare));
    perBuilding.set(a.buildingId, m);
  }
  const byBuilding = buildingList.map((b) => ({
    buildingId: b.id,
    code: b.code,
    name: b.name,
    contractors: Object.fromEntries(perBuilding.get(b.id) ?? []),
  }));
  return {
    from,
    to,
    contractors,
    daily,
    byBuilding,
    totals: {
      manDays: contractors.reduce((s, c) => s + c.manDays, 0),
      manHours: contractors.reduce((s, c) => s + c.manHours, 0),
      reportedDays: days,
      avgDaily: days ? Math.round(contractors.reduce((s, c) => s + c.manDays, 0) / days) : 0,
    },
  };
}

// Site plan: everything happening in each building on one day — people and work
// (morning allocation) plus what was requested for that day (evening before).
// Range-aware: for one day `headcount` = people that day; for a range it is man-days
// (sum over days) and `avgDaily` = man-days / days with any report in the range.
export async function siteDayService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [buildingList, allocations, machinery, equipment, roads, permits, inspections] = await Promise.all([
    listBuildings(db, projectId),
    listAllocationDetailsInRange(db, projectId, from, to),
    listBookingsInRange(db, projectId, from, to),
    listEquipmentRequestsInRange(db, projectId, from, to),
    listRoadUsageInRange(db, projectId, from, to),
    listPermitsInRange(db, projectId, from, to),
    listRequests(db, projectId, { from, to, by: "inspection" }),
  ]);
  const machineClash = new Set(findMachineryConflicts(machinery).flatMap((c) => c.bookingIds));
  const reportedDays = Math.max(1, new Set(allocations.map((a) => a.reportDate)).size);
  return {
    date: from,
    from,
    to,
    reportedDays,
    buildings: buildingList.map((b) => {
      const work = allocations.filter((a) => a.buildingId === b.id);
      const contractors = [...new Set(work.map((a) => a.contractorCode))];
      // One day: people who worked there. Range: man-days, weighted by time spent in the building.
      const manDays = round1(work.reduce((s, a) => s + a.headcount * a.dayShare, 0));
      const headcount = from === to ? work.reduce((s, a) => s + a.headcount, 0) : manDays;
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        nameTh: b.nameTh,
        headcount,
        avgDaily: Math.round(manDays / reportedDays),
        contractors,
        activities: work,
        machinery: machinery.filter((m) => m.buildingId === b.id).map((m) => ({ ...m, conflict: machineClash.has(m.id) })),
        equipment: equipment.filter((e) => e.buildingId === b.id),
        roads: roads.filter((r) => r.buildingId === b.id),
        permits: permits.filter((p) => p.buildingId === b.id),
        inspections: inspections.filter((r) => r.buildingId === b.id && r.status !== "draft"),
      };
    }),
  };
}
