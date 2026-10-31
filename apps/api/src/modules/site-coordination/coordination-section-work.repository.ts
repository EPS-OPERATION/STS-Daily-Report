import { and, asc, eq, inArray } from "drizzle-orm";
import type { QueryDb } from "@/db/client.js";
import { reportSent } from "@/db/report-filters.js";
import { contractors, dailyReportAllocations, dailyReportForecasts, dailyReports } from "@/db/schema/index.js";

// What contractors reported on route sections (read-only for the Map): the day's Today Activity / extra-work rows,
// and the previous evening's Tomorrow Forecast rows that point at the day. Sent reports only.
export function listSectionActivities(db: QueryDb, projectId: string, date: string, sectionIds: string[]) {
  if (!sectionIds.length) return Promise.resolve([]);
  return db
    .select({
      id: dailyReportAllocations.id,
      sectionId: dailyReportAllocations.sectionId,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      discipline: dailyReportAllocations.discipline,
      work: dailyReportAllocations.workDescription,
      headcount: dailyReportAllocations.headcount,
      startTime: dailyReportAllocations.startTime,
      endTime: dailyReportAllocations.endTime,
      planPercent: dailyReportAllocations.planPercent,
      actualPercent: dailyReportAllocations.actualPercent,
      isAdditional: dailyReportAllocations.isAdditional,
    })
    .from(dailyReportAllocations)
    .innerJoin(dailyReports, eq(dailyReportAllocations.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(and(eq(dailyReports.projectId, projectId), eq(dailyReports.reportDate, date), reportSent, inArray(dailyReportAllocations.sectionId, sectionIds)))
    .orderBy(asc(contractors.code), asc(dailyReportAllocations.sortOrder));
}

export function listSectionForecasts(db: QueryDb, projectId: string, date: string, sectionIds: string[]) {
  if (!sectionIds.length) return Promise.resolve([]);
  return db
    .select({
      id: dailyReportForecasts.id,
      sectionId: dailyReportForecasts.sectionId,
      contractorId: dailyReports.contractorId,
      contractorCode: contractors.code,
      contractorName: contractors.name,
      work: dailyReportForecasts.description,
    })
    .from(dailyReportForecasts)
    .innerJoin(dailyReports, eq(dailyReportForecasts.reportId, dailyReports.id))
    .innerJoin(contractors, eq(dailyReports.contractorId, contractors.id))
    .where(and(eq(dailyReports.projectId, projectId), eq(dailyReportForecasts.targetDate, date), reportSent, inArray(dailyReportForecasts.sectionId, sectionIds)))
    .orderBy(asc(contractors.code), asc(dailyReportForecasts.sortOrder));
}
