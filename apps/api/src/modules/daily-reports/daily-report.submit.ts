import { allocationPeak, canEditReport, editDeadline, routeGeometryError, timeWindowsOverlap } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { isContractorInProject } from "@/modules/site-activities/site-activity.repository.js";
import { listRoadSegments } from "@/modules/site-coordination/coordination.repository.js";
import { ConflictError, ValidationError } from "@/shared/errors/app-error.js";
import { saveEvening, saveMorning } from "./daily-report-save.repository.js";
import { assertContractorAccess, reportDetail } from "./daily-report.detail.js";
import { getReportByKey, listAllocations } from "./daily-report.repository.js";
import type { CrewInput, EquipmentRequestInput, EveningInput, MachineryInput, MorningInput, PermitInput, RoadUsageInput } from "./daily-report.type.js";

// A sent shift can be edited until 12:00 site time the next day; trial mode lifts the limit.
// First-time (late) submissions are not affected — only changes to what was already sent.
export function assertEditable(reportDate: string, what: string, reportId: string) {
  if (getEnv().ALLOW_RESUBMIT || canEditReport(reportDate)) return;
  throw new ConflictError(`${what} can no longer be edited — edits close at 12:00 the day after the report date`, {
    reportId,
    editableUntil: editDeadline(reportDate).toISOString(),
  });
}

// ---- crews -----------------------------------------------------------------

// A crew is valid when it has people, positions are unique and the nationality/sex split
// adds up to the same headcount. Returns that headcount.
function validateCrew(crew: CrewInput): number {
  const seen = new Set<string>();
  for (const p of crew.positions) {
    if (seen.has(p.position)) {
      throw new ValidationError("Each position may appear only once", { discipline: crew.discipline, position: p.position });
    }
    seen.add(p.position);
  }
  const total = crew.positions.reduce((sum, p) => sum + p.headcount, 0);
  if (total <= 0) throw new ValidationError("Total headcount must be greater than 0", { discipline: crew.discipline });
  const byNationality = crew.thaiMale + crew.thaiFemale + crew.foreignMale + crew.foreignFemale;
  if (byNationality !== total) {
    throw new ValidationError("Nationality/sex split must equal the headcount by position", {
      discipline: crew.discipline,
      byPosition: total,
      byNationality,
    });
  }
  return total;
}

// ---- morning ---------------------------------------------------------------

export async function submitMorningService(auth: AuthContext, projectId: string, input: MorningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId, projectId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }

  const existing = await getReportByKey(db, projectId, input.contractorId, input.date);
  // Shifts are independent. Re-sending the morning keeps the evening actuals of buildings
  // that stay allocated (see saveMorning).
  if (existing?.morningStatus === "submitted") assertEditable(input.date, "The morning report", existing.id);

  if (input.startTime >= input.endTime) {
    throw new ValidationError("End time must be after start time", { startTime: input.startTime, endTime: input.endTime });
  }

  const seenCrews = new Set<string>();
  for (const crew of input.crews) {
    if (seenCrews.has(crew.discipline)) throw new ValidationError("Each discipline may appear only once", { discipline: crew.discipline });
    seenCrews.add(crew.discipline);
  }
  const seenEquipment = new Set<string>();
  for (const e of input.equipment) {
    const name = e.equipmentType.trim();
    if (!name) throw new ValidationError("Equipment name is required");
    if (name.length > 120) throw new ValidationError("Equipment name is too long", { equipmentType: name });
    const key = name.toLowerCase();
    if (seenEquipment.has(key)) {
      throw new ValidationError("Each equipment type may appear only once", { equipmentType: e.equipmentType });
    }
    seenEquipment.add(key);
  }

  const buildingIds = new Set((await listBuildings(db, projectId)).map((b) => b.id));
  if (input.permits) {
    for (const p of input.permits) {
      if (!buildingIds.has(p.buildingId)) throw new ValidationError("Unknown building", { buildingId: p.buildingId });
      if (p.permitType === "other" && !p.otherLabel?.trim()) throw new ValidationError("Describe the permit when type is Other");
      if (p.highRisk && (!p.taskName?.trim() || !p.supervisorName?.trim())) {
        throw new ValidationError("High-risk work needs a task name and an EPS supervisor", { permitType: p.permitType });
      }
    }
  }
  for (const crew of input.crews) {
    // Position headcount is the primary total; the nationality/sex split must describe the same people.
    const total = validateCrew(crew);
    for (const a of crew.allocations) {
      if (!buildingIds.has(a.buildingId)) throw new ValidationError("Unknown building", { buildingId: a.buildingId });
      if (Boolean(a.startTime) !== Boolean(a.endTime)) {
        throw new ValidationError("Give both start and end time for an activity, or neither (= all day)", { buildingId: a.buildingId });
      }
      if (a.startTime && a.endTime && a.startTime >= a.endTime) {
        throw new ValidationError("Activity end time must be after its start time", { startTime: a.startTime, endTime: a.endTime });
      }
    }
    // The same building may repeat in a discipline only for windows that do not overlap.
    crew.allocations.forEach((a, i) => {
      for (const b of crew.allocations.slice(i + 1)) {
        if (a.buildingId !== b.buildingId) continue;
        const overlap = timeWindowsOverlap(
          a.startTime ?? input.startTime,
          a.endTime ?? input.endTime,
          b.startTime ?? input.startTime,
          b.endTime ?? input.endTime,
        );
        if (overlap) {
          throw new ValidationError("The same building is listed twice for overlapping times", {
            discipline: crew.discipline,
            buildingId: a.buildingId,
          });
        }
      }
    });
    // Only impossible data is refused: more people working at the same moment than came today.
    // Leaving people unassigned or not covering the whole day is allowed.
    const peak = allocationPeak(crew.allocations, input.startTime, input.endTime);
    if (peak.placed > total) {
      throw new ValidationError("More people are placed at the same time than came to work", {
        discipline: crew.discipline,
        total,
        placed: peak.placed,
        from: peak.from,
        to: peak.to,
      });
    }
  }

  const reportId = await saveMorning(db, projectId, input, auth.user.id);
  return reportDetail(reportId);
}

// ---- evening ---------------------------------------------------------------

function validateTomorrow(
  buildingIds: Set<string>,
  machinery: MachineryInput[],
  equipment: EquipmentRequestInput[],
  permits: PermitInput[] = [],
  roads: RoadUsageInput[],
  forecasts: { buildingId: string; description: string }[],
) {
  if (forecasts.length === 0) throw new ValidationError("เพิ่มแผนงานพรุ่งนี้อย่างน้อย 1 รายการ");
  for (const f of forecasts) {
    if (!f.description.trim()) throw new ValidationError("Describe each forecast activity");
  }
  for (const b of [...machinery, ...equipment, ...permits, ...forecasts]) {
    if (!buildingIds.has(b.buildingId)) throw new ValidationError("Unknown building", { buildingId: b.buildingId });
  }
  for (const r of roads) {
    if (r.buildingId && !buildingIds.has(r.buildingId)) {
      throw new ValidationError("Unknown building", { buildingId: r.buildingId });
    }
  }
  for (const m of machinery) {
    if (Boolean(m.startTime) !== Boolean(m.endTime)) {
      throw new ValidationError("Give both start and end time, or neither (= all day)", { machineType: m.machineType });
    }
    if (m.startTime && m.endTime && m.startTime >= m.endTime) {
      throw new ValidationError("End time must be after start time", { startTime: m.startTime });
    }
  }
  for (const r of roads) {
    if (r.startTime >= r.endTime) throw new ValidationError("End time must be after start time", { startTime: r.startTime });
  }
  for (const p of permits) {
    if (p.permitType === "other" && !p.otherLabel?.trim()) throw new ValidationError("Describe the permit when type is Other");
    if (p.highRisk && (!p.taskName?.trim() || !p.supervisorName?.trim())) {
      throw new ValidationError("High-risk work needs a task name and an EPS supervisor", { permitType: p.permitType });
    }
  }
  for (const r of roads) {
    if (!r.roadLocation.trim() || !r.purpose.trim()) throw new ValidationError("Road usage needs a location and a purpose");
  }
}

// Independent of the morning shift: works whether or not a morning report exists.
export async function submitEveningService(auth: AuthContext, projectId: string, input: EveningInput) {
  const db = getDb();
  await assertProject(projectId);
  await assertContractorAccess(auth, input.contractorId, projectId);
  if (!(await isContractorInProject(db, projectId, input.contractorId))) {
    throw new ValidationError("Contractor is not assigned to this project", { contractorId: input.contractorId });
  }
  const report = await getReportByKey(db, projectId, input.contractorId, input.date);
  if (report?.eveningStatus === "submitted") assertEditable(input.date, "The evening report", report.id);
  if (!report?.signatureData && !input.signatureData) {
    throw new ValidationError("กรุณาลงนามยืนยันก่อนส่งรายงาน");
  }

  if (input.accidentOccurred && !input.accidentNote?.trim()) {
    throw new ValidationError("Describe the accident when one occurred");
  }
  if (input.accidentOccurred && !input.accidentCategory) {
    throw new ValidationError("Choose the accident category");
  }
  const seenCrews = new Set<string>();
  for (const crew of input.crews) {
    if (seenCrews.has(crew.discipline)) throw new ValidationError("Each discipline may appear only once", { discipline: crew.discipline });
    seenCrews.add(crew.discipline);
    validateCrew(crew);
  }
  const buildingIds = new Set((await listBuildings(db, projectId)).map((b) => b.id));
  // OT rows: a known building, a task, and never more people on one row than worked the afternoon.
  const afternoonCrew = input.crews.reduce((s, c) => s + c.thaiMale + c.thaiFemale + c.foreignMale + c.foreignFemale, 0);
  for (const o of input.overtime ?? []) {
    if (!buildingIds.has(o.buildingId)) throw new ValidationError("Unknown building", { buildingId: o.buildingId });
    if (!o.task.trim()) throw new ValidationError("Describe the OT work");
    if (o.workers > afternoonCrew) throw new ValidationError(`OT people (${o.workers}) exceed the afternoon crew (${afternoonCrew})`);
  }
  validateTomorrow(
    buildingIds,
    input.machinery,
    input.equipmentRequests,
    input.permits ?? [],
    input.roadUsage,
    input.forecasts ?? [],
  );
  // Road routes: picked segments must be in this project's register; any line must be a valid route.
  if (input.roadUsage.some((r) => r.segmentIds?.length || r.route)) {
    const register = new Set((await listRoadSegments(db, projectId)).map((s) => s.id));
    for (const r of input.roadUsage) {
      if ((r.segmentIds ?? []).some((id) => !register.has(id))) throw new ValidationError("A chosen road segment is not in the road register", { road: r.roadLocation });
      const error = r.route ? routeGeometryError(r.route) : null;
      if (error) throw new ValidationError(error, { road: r.roadLocation });
    }
  }
  // Materials on site: one row per material + unit, positive quantity.
  const seenMaterials = new Set<string>();
  for (const m of input.materials) {
    const name = m.name.trim();
    const unit = m.unit.trim();
    if (!name) throw new ValidationError("Material name is required");
    if (!unit) throw new ValidationError("Material unit is required", { material: name });
    if (!Number.isFinite(m.qty) || m.qty <= 0) {
      throw new ValidationError("Material quantity must be above 0", { material: name });
    }
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    if (seenMaterials.has(key)) {
      throw new ValidationError("Each material + unit may appear only once", { material: name });
    }
    seenMaterials.add(key);
  }

  // Actuals are only possible for buildings the morning shift planned.
  const allocations = report ? await listAllocations(db, report.id) : [];
  const byId = new Map(input.progress.map((p) => [p.allocationId, p]));
  const missing = allocations.filter((a) => !byId.has(a.id)).map((a) => a.buildingCode);
  if (missing.length > 0 || byId.size !== allocations.length) {
    throw new ValidationError("Report actual progress for every allocated building", { missing });
  }
  for (const a of allocations) {
    const p = byId.get(a.id)!;
    // No stated plan → actual % only, nothing to be "behind" against.
    if (a.planPercent !== null && p.actualPercent < a.planPercent && !p.countermeasure?.trim()) {
      throw new ValidationError("Countermeasure is required when actual progress is below plan", {
        buildingCode: a.buildingCode,
        planPercent: a.planPercent,
        actualPercent: p.actualPercent,
      });
    }
  }

  const reportId = await saveEvening(db, projectId, input, auth.user.id);
  return reportDetail(reportId);
}

// ---- EPS review ------------------------------------------------------------
