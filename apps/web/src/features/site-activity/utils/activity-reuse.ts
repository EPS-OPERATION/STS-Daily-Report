import type { SiteActivityRecord } from "@/types/site-operations.types.js";

// Pure reuse helpers for the "Use again" workflow. Reuse copies the work
// definition (title, description, Contractor, Facility, Part, Status, times)
// but NEVER the daily facts: Work Date always comes from the current Site
// Activity context, and Workers/Progress are copied only as reviewable
// starting values. No persistent lineage is stored (no copied-from id).

export interface ReuseDraft {
  title: string;
  description: string;
  contractorId: string | null;
  facilityId: string;
  facilityPartId: string | null;
  status: SiteActivityRecord["status"];
  manpower: number;
  progressPercent: number;
  startTime: string;
  endTime: string;
}

export function buildReuseDraft(source: SiteActivityRecord, options: { contractorId: string | null }): ReuseDraft {
  return {
    title: source.title,
    description: source.description ?? "",
    contractorId: options.contractorId,
    facilityId: source.facility?.id ?? "",
    facilityPartId: source.facilityPart?.id ?? null,
    status: source.status,
    manpower: source.manpower,
    progressPercent: source.progressPercent,
    startTime: source.startTime ?? "",
    endTime: source.endTime ?? "",
  };
}

export function rankSuggestions(
  rows: SiteActivityRecord[],
  options: { contractorId?: string | null; partId?: string | null; limit?: number },
): SiteActivityRecord[] {
  const limit = options.limit ?? 5;
  return [...rows]
    .map((row, index) => {
      let score = 0;
      if (options.contractorId && row.contractor.id === options.contractorId) score += 2;
      if (options.partId && row.facilityPart?.id === options.partId) score += 1;
      return { row, index, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.row.workDate !== b.row.workDate) return a.row.workDate < b.row.workDate ? 1 : -1;
      if (a.row.createdAt !== b.row.createdAt) return a.row.createdAt < b.row.createdAt ? 1 : -1;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map((entry) => entry.row);
}

export function findDuplicate(
  rows: SiteActivityRecord[],
  options: { title: string; contractorId: string; partId: string | null; excludeId?: string },
): SiteActivityRecord | null {
  const want = options.title.trim().toLowerCase();
  if (!want) return null;
  return (
    rows.find(
      (row) =>
        row.id !== options.excludeId &&
        row.title.trim().toLowerCase() === want &&
        row.contractor.id === options.contractorId &&
        (row.facilityPart?.id ?? null) === (options.partId ?? null),
    ) ?? null
  );
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function relativeDayLabel(workDate: string, todayYmd: string): string {
  if (workDate === todayYmd) return "Today";
  const ref = new Date(todayYmd + "T00:00:00Z");
  ref.setUTCDate(ref.getUTCDate() - 1);
  if (workDate === ref.toISOString().slice(0, 10)) return "Yesterday";
  const [year, month, day] = workDate.split("-").map(Number);
  if (!year || !month || !day) return workDate;
  return `${String(day).padStart(2, "0")} ${SHORT_MONTHS[month - 1]} ${year}`;
}
