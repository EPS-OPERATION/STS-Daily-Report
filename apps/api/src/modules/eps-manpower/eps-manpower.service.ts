import { allocationPeak, coordinationDateValid, type Discipline, type PositionCode } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { getDb } from "@/db/client.js";
import { listBuildings } from "@/modules/buildings/building.repository.js";
import { getReportByKey, listAllocations, listPositions } from "@/modules/daily-reports/daily-report.repository.js";
import { saveMorning } from "@/modules/daily-reports/daily-report-save.repository.js";
import type { MorningCrewInput } from "@/modules/daily-reports/daily-report.type.js";
import { assertProject } from "@/modules/projects/project.guard.js";
import { assertEpsStaff } from "@/middleware/require-eps.js";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { findOwnerContractor } from "./eps-manpower.repository.js";
import type { EpsManpowerEntry, EpsManpowerInput } from "./eps-manpower.type.js";

// The daily-report tables require a discipline even for the owner company. EPS manpower is stored
// as one internal crew; the discipline is not exposed in the EPS form or the manpower charts.
const EPS_STORAGE_DISCIPLINE: Discipline = "CE";

async function loadEntry(projectId: string, contractorId: string, date: string): Promise<EpsManpowerEntry | null> {
  const db = getDb();
  const report = await getReportByKey(db, projectId, contractorId, date);
  if (!report) return null;
  const [positions, allocations] = await Promise.all([
    listPositions(db, report.id, "morning"),
    listAllocations(db, report.id),
  ]);
  return {
    date: report.reportDate,
    startTime: report.startTime,
    endTime: report.endTime,
    workHours: report.workHours,
    otHours: report.otHours,
    positions: positions.map((p) => ({ position: p.position as PositionCode, headcount: p.headcount })),
    thaiMale: report.thaiMale,
    thaiFemale: report.thaiFemale,
    foreignMale: report.foreignMale,
    foreignFemale: report.foreignFemale,
    allocations: allocations
      .filter((a) => !a.isAdditional)
      .map((a) => ({
        buildingId: a.buildingId,
        buildingCode: a.buildingCode,
        buildingName: a.buildingName,
        headcount: a.headcount,
        workDescription: a.workDescription,
        ...(a.startTime && a.endTime ? { startTime: a.startTime, endTime: a.endTime } : {}),
      })),
  };
}

export async function getEpsManpowerService(auth: AuthContext, projectId: string, date: string) {
  assertEpsStaff(auth);
  await assertProject(projectId);
  if (!coordinationDateValid(date)) throw new ValidationError("Invalid date");
  const db = getDb();
  const owner = await findOwnerContractor(db, projectId);
  if (!owner) throw new NotFoundError("This project has no EPS owner company");
  return { contractor: owner, entry: await loadEntry(projectId, owner.id, date) };
}

function validateInput(input: EpsManpowerInput, buildingIds: Set<string>) {
  if (!coordinationDateValid(input.date)) throw new ValidationError("Invalid date");
  if (input.startTime >= input.endTime) {
    throw new ValidationError("End time must be after start time", { startTime: input.startTime, endTime: input.endTime });
  }

  const seen = new Set<string>();
  let total = 0;
  for (const p of input.positions) {
    if (seen.has(p.position)) throw new ValidationError("Each position may appear only once", { position: p.position });
    seen.add(p.position);
    total += p.headcount;
  }
  if (total <= 0) throw new ValidationError("Total headcount must be greater than 0");

  const byNationality = input.thaiMale + input.thaiFemale + input.foreignMale + input.foreignFemale;
  if (byNationality !== total) {
    throw new ValidationError("Nationality/sex split must equal the headcount by position", { byPosition: total, byNationality });
  }

  const allocations = input.allocations ?? [];
  for (const a of allocations) {
    if (!buildingIds.has(a.buildingId)) throw new ValidationError("Unknown building", { buildingId: a.buildingId });
    if (!a.workDescription.trim()) throw new ValidationError("Describe the work in each building");
    if (Boolean(a.startTime) !== Boolean(a.endTime)) {
      throw new ValidationError("Give both start and end time, or neither (= all day)", { buildingId: a.buildingId });
    }
    if (a.startTime && a.endTime && a.startTime >= a.endTime) {
      throw new ValidationError("Activity end time must be after its start time", { startTime: a.startTime, endTime: a.endTime });
    }
  }
  const peak = allocationPeak(allocations, input.startTime, input.endTime);
  if (peak.placed > total) {
    throw new ValidationError("More people are placed at the same time than EPS headcount", {
      total,
      placed: peak.placed,
      from: peak.from,
      to: peak.to,
    });
  }
  return total;
}

export async function saveEpsManpowerService(auth: AuthContext, projectId: string, input: EpsManpowerInput) {
  assertEpsStaff(auth);
  await assertProject(projectId);
  const db = getDb();
  const owner = await findOwnerContractor(db, projectId);
  if (!owner) throw new NotFoundError("This project has no EPS owner company");

  const buildings = await listBuildings(db, projectId);
  validateInput(input, new Set(buildings.map((b) => b.id)));

  const crew: MorningCrewInput = {
    discipline: EPS_STORAGE_DISCIPLINE,
    positions: input.positions,
    thaiMale: input.thaiMale,
    thaiFemale: input.thaiFemale,
    foreignMale: input.foreignMale,
    foreignFemale: input.foreignFemale,
    allocations: (input.allocations ?? []).map((a) => ({
      buildingId: a.buildingId,
      headcount: a.headcount,
      workDescription: a.workDescription.trim(),
      ...(a.startTime && a.endTime ? { startTime: a.startTime, endTime: a.endTime } : {}),
    })),
  };

  await saveMorning(
    db,
    projectId,
    {
      date: input.date,
      contractorId: owner.id,
      startTime: input.startTime,
      endTime: input.endTime,
      workHours: input.workHours,
      // Not part of the EPS form: the graph only needs hours, positions and buildings.
      weather: "normal",
      equipment: [],
      crews: [crew],
      permits: [],
      otHours: input.otHours ?? 0,
    },
    auth.user.id,
  );

  return { contractor: owner, entry: await loadEntry(projectId, owner.id, input.date) };
}
