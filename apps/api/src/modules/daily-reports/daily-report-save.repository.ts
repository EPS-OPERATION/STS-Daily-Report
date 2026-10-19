import { DISCIPLINE_CODES, addDays, allocationDayShares, overtimeTotals } from "@sts/shared";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client.js";
import { dailyReportAllocations, dailyReportCrews, dailyReportEquipment, dailyReportEquipmentRequests, dailyReportForecasts, dailyReportMachinery, dailyReportMaterials, dailyReportOvertime, dailyReportPermits, dailyReportPositions, dailyReportRoadUsage, dailyReports, inspectionRequests } from "@/db/schema/index.js";
import { listAdjustedRoads } from "@/modules/daily-requests/daily-request.repository.js";
import { carryRoadAdjustments } from "@/modules/daily-requests/daily-request.road.js";
import { getReportByKey } from "./daily-report.repository.js";
import type { CrewInput, EveningInput, MorningInput } from "./daily-report.type.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Upsert header + replace morning children atomically. Evening fields are untouched.
const sumSplit = (crews: CrewInput[]) => ({
  thaiMale: crews.reduce((s, c) => s + c.thaiMale, 0),
  thaiFemale: crews.reduce((s, c) => s + c.thaiFemale, 0),
  foreignMale: crews.reduce((s, c) => s + c.foreignMale, 0),
  foreignFemale: crews.reduce((s, c) => s + c.foreignFemale, 0),
});

const crewRows = (reportId: string, shift: "morning" | "evening", crews: CrewInput[]) => ({
  crews: crews.map((c) => ({
    reportId,
    shift,
    discipline: c.discipline,
    thaiMale: c.thaiMale,
    thaiFemale: c.thaiFemale,
    foreignMale: c.foreignMale,
    foreignFemale: c.foreignFemale,
  })),
  positions: crews.flatMap((c) =>
    c.positions.map((p) => ({ reportId, shift, discipline: c.discipline, position: p.position, headcount: p.headcount })),
  ),
});

export async function saveMorning(db: Db, projectId: string, input: MorningInput, userId: string) {
  return db.transaction(async (tx: Tx) => {
    const now = new Date();
    const existing = await getReportByKey(tx, projectId, input.contractorId, input.date);
    const isEdit = existing?.morningStatus === "submitted";
    const split = sumSplit(input.crews);
    const header = {
      startTime: input.startTime,
      endTime: input.endTime,
      workHours: input.workHours,
      disciplines: DISCIPLINE_CODES.filter((d) => input.crews.some((c) => c.discipline === d)),
      weather: input.weather,
      temperatureC: input.temperatureC ?? null,
      humidityPct: input.humidityPct ?? null,
      ...split,
      morningStatus: "submitted",
      morningSubmittedAt: isEdit ? (existing.morningSubmittedAt ?? now) : now,
      morningSubmittedBy: userId,
      morningUpdatedAt: isEdit ? now : (existing?.morningUpdatedAt ?? null),
      // A re-sent shift changes what EPS reviewed — it goes back to the queue.
      reviewStatus: "pending",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(dailyReports)
      .values({ projectId, contractorId: input.contractorId, reportDate: input.date, ...header })
      .onConflictDoUpdate({
        target: [dailyReports.projectId, dailyReports.contractorId, dailyReports.reportDate],
        set: header,
      })
      .returning({ id: dailyReports.id });
    const reportId = row!.id;

    // Re-sending the morning must not wipe actuals the evening already reported:
    // carry them over for buildings that are still allocated.
    const previous = new Map(
      (
        await tx
          .select({
            buildingId: dailyReportAllocations.buildingId,
            discipline: dailyReportAllocations.discipline,
            startTime: dailyReportAllocations.startTime,
            endTime: dailyReportAllocations.endTime,
            actualPercent: dailyReportAllocations.actualPercent,
            countermeasure: dailyReportAllocations.countermeasure,
          })
          .from(dailyReportAllocations)
          .where(eq(dailyReportAllocations.reportId, reportId))
      ).map((a) => [`${a.discipline}|${a.buildingId}|${a.startTime ?? ""}|${a.endTime ?? ""}`, a]),
    );
    await tx
      .delete(dailyReportAllocations)
      .where(and(eq(dailyReportAllocations.reportId, reportId), eq(dailyReportAllocations.isAdditional, false)));
    await tx
      .delete(dailyReportPositions)
      .where(and(eq(dailyReportPositions.reportId, reportId), eq(dailyReportPositions.shift, "morning")));
    await tx
      .delete(dailyReportCrews)
      .where(and(eq(dailyReportCrews.reportId, reportId), eq(dailyReportCrews.shift, "morning")));
    await tx.delete(dailyReportEquipment).where(eq(dailyReportEquipment.reportId, reportId));
    // Permits EPS added or edited stay; the contractor's copy of the same permit (building + type) is dropped.
    const epsPermits = await tx
      .select({ buildingId: dailyReportPermits.buildingId, permitType: dailyReportPermits.permitType, otherLabel: dailyReportPermits.otherLabel })
      .from(dailyReportPermits)
      .where(
        and(
          eq(dailyReportPermits.reportId, reportId),
          or(eq(dailyReportPermits.epsAdded, true), isNotNull(dailyReportPermits.epsEditedAt)),
        ),
      );
    const permitKey = (p: { buildingId: string; permitType: string; otherLabel?: string | null }) =>
      `${p.buildingId}|${p.permitType}|${p.permitType === "other" ? (p.otherLabel ?? "").trim().toLowerCase() : ""}`;
    const keptPermits = new Set(epsPermits.map(permitKey));
    await tx
      .delete(dailyReportPermits)
      .where(
        and(
          eq(dailyReportPermits.reportId, reportId),
          eq(dailyReportPermits.epsAdded, false),
          sql`${dailyReportPermits.epsEditedAt} IS NULL`,
        ),
      );

    const morning = crewRows(reportId, "morning", input.crews);
    await tx.insert(dailyReportCrews).values(morning.crews);
    await tx.insert(dailyReportPositions).values(morning.positions);
    if (input.equipment.length > 0) {
      await tx
        .insert(dailyReportEquipment)
        .values(input.equipment.map((e) => ({ reportId, equipmentType: e.equipmentType.trim(), qty: e.qty })));
    }
    const contractorPermits = (input.permits ?? []).filter((p) => !keptPermits.has(permitKey(p)));
    if (contractorPermits.length > 0) {
      await tx.insert(dailyReportPermits).values(
        contractorPermits.map((p) => ({
          reportId,
          targetDate: input.date,
          buildingId: p.buildingId,
          permitType: p.permitType,
          otherLabel: p.permitType === "other" ? p.otherLabel?.trim() || null : null,
          workers: p.workers,
          highRisk: Boolean(p.highRisk),
          taskName: p.highRisk ? p.taskName?.trim() || null : null,
          supervisorName: p.highRisk ? p.supervisorName?.trim() || null : null,
        })),
      );
    }
    // Allocations of all crews, in crew order; sort_order keeps one running sequence.
    const allocationRows = input.crews.flatMap((c) => {
      const shares = allocationDayShares(c.allocations, input.startTime, input.endTime);
      return c.allocations.map((a, i) => {
        const key = `${c.discipline}|${a.buildingId}|${a.startTime ?? ""}|${a.endTime ?? ""}`;
        return {
          reportId,
          discipline: c.discipline,
          buildingId: a.buildingId,
          headcount: a.headcount,
          workDescription: a.workDescription.trim(),
          startTime: a.startTime ?? null,
          endTime: a.endTime ?? null,
          dayShare: shares[i] ?? 1,
          planPercent: a.planPercent ?? null,
          actualPercent: previous.get(key)?.actualPercent ?? null,
          countermeasure: previous.get(key)?.countermeasure ?? null,
        };
      });
    });
    await tx.insert(dailyReportAllocations).values(allocationRows.map((a, i) => ({ ...a, sortOrder: i })));
    return reportId;
  });
}

// Evening Daily Request works with or without a morning report: upsert the header,
// record actuals for any morning allocations, and replace tomorrow's requests.
export async function saveEvening(db: Db, projectId: string, input: EveningInput, userId: string) {
  return db.transaction(async (tx: Tx) => {
    const now = new Date();
    const existing = await getReportByKey(tx, projectId, input.contractorId, input.date);
    const isEdit = existing?.eveningStatus === "submitted";
    const signatureData = input.signatureData || existing?.signatureData || null;
    const tomorrow = addDays(input.date, 1);
    const split = sumSplit(input.crews);
    // Itemised OT sets both the per-person hours shown on the report and the man-hours NMH uses.
    const ot = input.overtime ? overtimeTotals(input.overtime) : null;
    const header = {
      eveningThaiMale: split.thaiMale,
      eveningThaiFemale: split.thaiFemale,
      eveningForeignMale: split.foreignMale,
      eveningForeignFemale: split.foreignFemale,
      otHours: ot ? ot.maxHours : input.otHours,
      otManHours: ot ? ot.manHours : null,
      accidentOccurred: input.accidentOccurred,
      accidentNote: input.accidentOccurred ? input.accidentNote?.trim() || null : null,
      accidentCategory: input.accidentOccurred ? (input.accidentCategory ?? null) : null,
      signatureName: input.signatureName.trim(),
      ...(signatureData ? { signatureData } : {}),
      signedAt: input.signatureData ? now : (existing?.signedAt ?? now),
      eveningStatus: "submitted",
      eveningSubmittedAt: isEdit ? (existing.eveningSubmittedAt ?? now) : now,
      eveningSubmittedBy: userId,
      eveningUpdatedAt: isEdit ? now : (existing?.eveningUpdatedAt ?? null),
      // A re-sent shift changes what EPS reviewed — it goes back to the queue.
      reviewStatus: "pending",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(dailyReports)
      .values({ projectId, contractorId: input.contractorId, reportDate: input.date, ...header })
      .onConflictDoUpdate({
        target: [dailyReports.projectId, dailyReports.contractorId, dailyReports.reportDate],
        set: header,
      })
      .returning({ id: dailyReports.id });
    const reportId = row!.id;

    for (const p of input.progress) {
      await tx
        .update(dailyReportAllocations)
        .set({
          actualPercent: p.actualPercent,
          countermeasure: p.countermeasure?.trim() || null,
          updatedAt: now,
        })
        .where(and(eq(dailyReportAllocations.id, p.allocationId), eq(dailyReportAllocations.reportId, reportId)));
    }

    await tx
      .delete(dailyReportAllocations)
      .where(and(eq(dailyReportAllocations.reportId, reportId), eq(dailyReportAllocations.isAdditional, true)));

    if (input.additionalAllocations?.length) {
      await tx.insert(dailyReportAllocations).values(
        input.additionalAllocations.map((a, i) => ({
          reportId,
          buildingId: a.buildingId,
          discipline: a.discipline,
          headcount: a.headcount,
          workDescription: a.workDescription.trim(),
          startTime: a.startTime ?? null,
          endTime: a.endTime ?? null,
          dayShare: 1,
          planPercent: null,
          actualPercent: a.actualPercent,
          countermeasure: null,
          isAdditional: true,
          sortOrder: 100 + i,
        })),
      );
    }

    await tx
      .delete(dailyReportPositions)
      .where(and(eq(dailyReportPositions.reportId, reportId), eq(dailyReportPositions.shift, "evening")));
    await tx
      .delete(dailyReportCrews)
      .where(and(eq(dailyReportCrews.reportId, reportId), eq(dailyReportCrews.shift, "evening")));
    const evening = crewRows(reportId, "evening", input.crews);
    await tx.insert(dailyReportCrews).values(evening.crews);
    await tx.insert(dailyReportPositions).values(evening.positions);
    // An evening-only report has no morning to name its disciplines: take them from the crews.
    await tx
      .update(dailyReports)
      .set({ disciplines: DISCIPLINE_CODES.filter((d) => input.crews.some((c) => c.discipline === d)) })
      .where(and(eq(dailyReports.id, reportId), sql`cardinality(${dailyReports.disciplines}) = 0`));

    await tx.delete(dailyReportMachinery).where(eq(dailyReportMachinery.reportId, reportId));
    await tx.delete(dailyReportEquipmentRequests).where(eq(dailyReportEquipmentRequests.reportId, reportId));
    // EPS time changes survive a re-sent report when the same request comes back unchanged (carryRoadAdjustments).
    const carriedRoads = carryRoadAdjustments(await listAdjustedRoads(tx, reportId), input.roadUsage);
    await tx.delete(dailyReportRoadUsage).where(eq(dailyReportRoadUsage.reportId, reportId));
    await tx.delete(dailyReportMaterials).where(eq(dailyReportMaterials.reportId, reportId));
    await tx.delete(dailyReportForecasts).where(eq(dailyReportForecasts.reportId, reportId));
    await tx.delete(dailyReportOvertime).where(eq(dailyReportOvertime.reportId, reportId));
    if (input.overtime?.length) {
      await tx.insert(dailyReportOvertime).values(
        input.overtime.map((o, i) => ({ reportId, buildingId: o.buildingId, task: o.task.trim(), workers: o.workers, hours: o.hours, sortOrder: i })),
      );
    }
    if (input.machinery.length > 0) {
      await tx.insert(dailyReportMachinery).values(
        input.machinery.map((m) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: m.buildingId,
          machineType: m.machineType,
          unitTag: m.unitTag?.trim().toUpperCase() || null,
          startTime: m.startTime ?? null,
          endTime: m.endTime ?? null,
          purpose: m.purpose?.trim() || null,
        })),
      );
    }
    if (input.equipmentRequests.length > 0) {
      await tx.insert(dailyReportEquipmentRequests).values(
        input.equipmentRequests.map((e) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: e.buildingId,
          equipmentType: e.equipmentType.trim(),
          qty: e.qty,
          purpose: e.purpose?.trim() || null,
        })),
      );
    }
    if (input.roadUsage.length > 0) {
      await tx.insert(dailyReportRoadUsage).values(
        input.roadUsage.map((r, i) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: r.buildingId || null,
          roadLocation: r.roadLocation.trim(),
          startTime: r.startTime,
          endTime: r.endTime,
          purpose: r.purpose.trim(),
          segmentIds: r.segmentIds ?? [],
          route: r.route ?? null,
          ...(carriedRoads[i] ?? {}),
        })),
      );
    }
    const forecasts = input.forecasts ?? [];
    if (forecasts.length > 0) {
      await tx.insert(dailyReportForecasts).values(
        forecasts.map((f, i) => ({
          reportId,
          targetDate: tomorrow,
          buildingId: f.buildingId,
          description: f.description.trim(),
          sortOrder: i,
        })),
      );
    }
    if (input.materials.length > 0) {
      await tx.insert(dailyReportMaterials).values(
        input.materials.map((m) => ({
          reportId,
          materialName: m.name.trim(),
          qty: String(m.qty),
          unit: m.unit.trim(),
        })),
      );
    }
    // Sending the evening report sends that day's saved QAQC requests (for tomorrow) to EPS.
    await tx
      .update(inspectionRequests)
      .set({ status: "requested", statusChangedAt: now, statusChangedBy: userId, updatedAt: now })
      .where(
        and(
          eq(inspectionRequests.projectId, projectId),
          eq(inspectionRequests.contractorId, input.contractorId),
          eq(inspectionRequests.reportDate, input.date),
          eq(inspectionRequests.status, "draft"),
        ),
      );
    return reportId;
  });
}
