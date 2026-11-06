import { type PermitType, REQUEST_STATUSES, type RequestStatus, addDays, apportion, attendanceOf, largerCrewShift, mondayOf, normalizePagination, normalHoursOf, round1, workloadLevel } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { findMachineryConflicts, findRoadConflicts } from "@/modules/daily-requests/daily-request.conflicts.js";
import { listBookingsInRange, listEquipmentRequestsInRange, listPermitsInRange, listRoadUsageInRange } from "@/modules/daily-requests/daily-request.repository.js";
import { listRequests } from "@/modules/inspection-requests/inspection-request.repository.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { assertRange } from "@/shared/date-range.js";
import { countMaterialsLog, countRequestsByStatusInRange, listAllocationDetailsInRange, listAllocationsInRange, listMaterialsLog, listOnSiteEquipmentInRange, listPositionsInRange, listReportHoursInRange, summarizeMaterials } from "./report-summary.repository.js";

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
    listBuildings(db, projectId, { includeInactive: true }),
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
    if (!a.buildingId) continue; // route-section rows (no building) are not part of the building view
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
  const allRows = await listPositionsInRange(db, projectId, from, to);
  // One crew per report: the larger of the morning and afternoon crews (same rule as the day's man-day).
  const perReport = new Map<string, { morning: number | null; evening: number | null }>();
  for (const r of allRows) {
    const t = perReport.get(r.reportId) ?? { morning: null, evening: null };
    t[r.shift === "evening" ? "evening" : "morning"] = (t[r.shift === "evening" ? "evening" : "morning"] ?? 0) + r.headcount;
    perReport.set(r.reportId, t);
  }
  const rows = allRows.filter((r) => {
    const t = perReport.get(r.reportId)!;
    return largerCrewShift(t.morning, t.evening) === (r.shift === "evening" ? "evening" : "morning");
  });
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
    listBuildings(db, projectId, { includeInactive: true }),
  ]);
  const byContractor = new Map<
    string,
    { contractorId: string; contractorCode: string; manDays: number; manHours: number; reportedDays: number; estimatedDays: number; thaiMale: number; thaiFemale: number; foreignMale: number; foreignFemale: number }
  >();
  const daily: { date: string; contractorCode: string; headcount: number }[] = [];
  // NMH = normal man-hours + OT man-hours; the normal part uses the hours each report actually
  // states (8 h only for afternoon-only reports), so utilization compares against real time.
  let normalManHours = 0;
  let otManHours = 0;
  for (const r of rows) {
    const { manDays: headcount, manHours: hours } = attendanceOf(r);
    const normal = round1(headcount * (normalHoursOf(r) ?? 0));
    normalManHours += normal;
    otManHours += hours - normal;
    const c = byContractor.get(r.contractorId) ?? {
      contractorId: r.contractorId,
      contractorCode: r.contractorCode,
      manDays: 0,
      manHours: 0,
      reportedDays: 0,
      estimatedDays: 0,
      thaiMale: 0,
      thaiFemale: 0,
      foreignMale: 0,
      foreignFemale: 0,
    };
    c.manDays = round1(c.manDays + headcount);
    c.manHours = round1(c.manHours + hours);
    c.reportedDays += 1;
    // Nationality/sex of the larger crew of the day (morning on a tie), so the chart adds up to Man-days.
    const morningSent = r.morningStatus === "submitted";
    if (!morningSent && r.workHours === null) c.estimatedDays += 1; // NMH used STANDARD_WORK_HOURS
    const eveningSent = r.eveningStatus === "submitted" && r.eveningThaiMale !== null;
    const morningTotal = morningSent ? r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale : null;
    const eveningTotal = eveningSent ? (r.eveningThaiMale ?? 0) + (r.eveningThaiFemale ?? 0) + (r.eveningForeignMale ?? 0) + (r.eveningForeignFemale ?? 0) : null;
    const useEvening = largerCrewShift(morningTotal, eveningTotal) === "evening";
    c.thaiMale += useEvening ? (r.eveningThaiMale ?? 0) : r.thaiMale;
    c.thaiFemale += useEvening ? (r.eveningThaiFemale ?? 0) : r.thaiFemale;
    c.foreignMale += useEvening ? (r.eveningForeignMale ?? 0) : r.foreignMale;
    c.foreignFemale += useEvening ? (r.eveningForeignFemale ?? 0) : r.foreignFemale;
    byContractor.set(r.contractorId, c);
    daily.push({ date: r.reportDate, contractorCode: r.contractorCode, headcount });
  }
  const contractors = [...byContractor.values()].sort((a, b) => b.manDays - a.manDays);
  const days = new Set(rows.map((r) => r.reportDate)).size;
  // People per building (site order), split by contractor. Each contractor-day's headcount (the day's man-day)
  // is shared out over the places it worked in proportion to the time spent there, in whole people, so the
  // buildings add up to Man-days. A crew that moved is counted where it spent the most time.
  // Route sections (the 33 kV line, A-B, B-C, …) have no building: each section is its own row after the buildings.
  const dayCrew = new Map<string, number>();
  for (const r of rows) dayCrew.set(`${r.contractorId}|${r.reportDate}`, attendanceOf(r).manDays);
  const sectionRows = new Map<string, { code: string; name: string; order: number }>();
  const crewPlaces = new Map<string, { contractorCode: string; place: string; weight: number }[]>();
  for (const a of allocations) {
    const key = `${a.contractorId}|${a.reportDate}`;
    const places = crewPlaces.get(key) ?? [];
    const place = a.buildingId ?? `section-${a.sectionId}`;
    if (!a.buildingId && a.sectionId && !sectionRows.has(place)) {
      const map = a.sectionMap ?? "Route";
      const prefix = /^\d+\s*kv/i.exec(map)?.[0] ?? map; // "33 kV line route" → "33 kV"
      const label = `${prefix} ${a.sectionCode ?? ""}`.trim();
      sectionRows.set(place, { code: label, name: label, order: a.sectionOrder ?? 0 });
    }
    const hit = places.find((p) => p.place === place);
    if (hit) hit.weight += a.headcount * a.dayShare;
    else places.push({ contractorCode: a.contractorCode, place, weight: a.headcount * a.dayShare });
    crewPlaces.set(key, places);
  }
  const perPlace = new Map<string, Map<string, number>>();
  for (const [key, places] of crewPlaces) {
    const total = dayCrew.get(key) ?? places.reduce((s, p) => s + p.weight, 0);
    const people = apportion(total, places.map((p) => p.weight));
    places.forEach((p, i) => {
      const n = people[i] ?? 0;
      if (n === 0) return;
      const m = perPlace.get(p.place) ?? new Map<string, number>();
      m.set(p.contractorCode, (m.get(p.contractorCode) ?? 0) + n);
      perPlace.set(p.place, m);
    });
  }
  const byBuilding = [
    ...buildingList.map((b) => ({
      buildingId: b.id,
      code: b.code,
      name: b.name,
      contractors: Object.fromEntries(perPlace.get(b.id) ?? []),
    })),
    ...[...sectionRows]
      .filter(([place]) => perPlace.has(place))
      .sort(([, a], [, b]) => a.order - b.order || a.code.localeCompare(b.code, undefined, { numeric: true }))
      .map(([place, s]) => ({ buildingId: place, code: s.code, name: s.name, contractors: Object.fromEntries(perPlace.get(place) ?? []) })),
  ];
  return {
    from,
    to,
    contractors,
    daily,
    byBuilding,
    totals: {
      manDays: contractors.reduce((s, c) => s + c.manDays, 0),
      manHours: contractors.reduce((s, c) => s + c.manHours, 0),
      normalManHours: round1(normalManHours),
      otManHours: round1(otManHours),
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
    listBuildings(db, projectId, { includeInactive: true }),
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

// Machines for the EPS Daily Reports "Machines" tab: what contractors said is on site each day (morning report, no
// area) and what they booked for a day (afternoon Daily Request, with building, time and purpose).
export async function machineSummaryService(projectId: string, from: string, to: string) {
  const db = getDb();
  await assertProject(projectId);
  assertRange(from, to);
  const [onSite, bookings, buildingList] = await Promise.all([
    listOnSiteEquipmentInRange(db, projectId, from, to),
    listBookingsInRange(db, projectId, from, to),
    listBuildings(db, projectId, { includeInactive: true }),
  ]);
  const nameTh = new Map(buildingList.map((b) => [b.id, b.nameTh]));
  return {
    from,
    to,
    onSite,
    bookings: bookings.map(({ buildingId, ...b }) => ({ ...b, buildingNameTh: nameTh.get(buildingId) ?? null })),
  };
}
