import type { WorkDoneItem } from "../components/work-done-summary-table.js";

export const ALL_BUILDINGS = "All Buildings";

interface SiteDayBuilding {
  code: string;
  name: string;
  nameTh?: string | null;
  activities?: {
    reportDate: string;
    contractorCode: string;
    contractorName: string;
    buildingId: string;
    workDescription: string;
    headcount: number;
    planPercent: number | null;
    actualPercent: number | null;
  }[];
}

// Today Activities (building allocations) of every contractor, flattened for the Work Done Summary.
export function workDoneItemsFromSiteDay(buildings: SiteDayBuilding[]): WorkDoneItem[] {
  return buildings.flatMap((b) =>
    (b.activities ?? []).map((a, i) => ({
      id: `${a.reportDate}-${a.contractorCode}-${a.buildingId}-${i}`,
      reportDate: a.reportDate,
      contractorCode: a.contractorCode,
      contractorName: a.contractorName,
      buildingCode: b.code,
      buildingName: b.name,
      buildingNameTh: b.nameTh,
      workDescription: a.workDescription,
      headcount: a.headcount,
      planPercent: a.planPercent,
      actualPercent: a.actualPercent,
    })),
  );
}

// Same filter the Work Done Summary table and its printed report apply.
export function filterWorkDone(
  items: WorkDoneItem[],
  { contractor, building, search }: { contractor: string; building: string; search: string },
): WorkDoneItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (contractor !== "All Contractors" && item.contractorName !== contractor && item.contractorCode !== contractor) return false;
    if (building !== ALL_BUILDINGS && item.buildingName !== building) return false;
    if (q) {
      const text = `${item.workDescription} ${item.buildingName} ${item.buildingCode} ${item.contractorName} ${item.contractorCode}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

// Work Done Summary: click a column header to sort; default = contractor, then building.
export type WorkDoneSortKey = "date" | "work" | "building" | "contractor" | "headcount" | "plan" | "actual" | "status";
export type WorkDoneSort = { key: WorkDoneSortKey; dir: "asc" | "desc" };

// Status order when sorting: waiting for the afternoon, behind plan, on plan / recorded, ahead.
const statusRank = (i: WorkDoneItem) =>
  i.actualPercent === null ? 0 : i.planPercent !== null && i.actualPercent < i.planPercent ? 1 : i.planPercent !== null && i.actualPercent > i.planPercent ? 3 : 2;
const text = (a: string, b: string) => a.localeCompare(b, "th");
// Blank plan / actual always go last, whichever direction.
const num = (a: number | null, b: number | null, dir: 1 | -1) => (a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * dir);

function compare(a: WorkDoneItem, b: WorkDoneItem, { key, dir }: WorkDoneSort): number {
  const d = dir === "asc" ? 1 : -1;
  switch (key) {
    case "date":
      return text(a.reportDate, b.reportDate) * d;
    case "work":
      return text(a.workDescription, b.workDescription) * d;
    case "building":
      return text(a.buildingName, b.buildingName) * d;
    case "contractor":
      return text(a.contractorName || a.contractorCode, b.contractorName || b.contractorCode) * d;
    case "headcount":
      return (a.headcount - b.headcount) * d;
    case "plan":
      return num(a.planPercent, b.planPercent, d);
    case "actual":
      return num(a.actualPercent, b.actualPercent, d);
    case "status":
      return (statusRank(a) - statusRank(b)) * d;
  }
}

// Ties fall back to contractor → building → date → work, so rows of one company stay together.
const TIE_BREAK: WorkDoneSortKey[] = ["contractor", "building", "date", "work"];
export function sortWorkDone(items: WorkDoneItem[], sort: WorkDoneSort): WorkDoneItem[] {
  return [...items].sort((a, b) => {
    const first = compare(a, b, sort);
    if (first !== 0) return first;
    for (const key of TIE_BREAK) {
      if (key === sort.key) continue;
      const next = compare(a, b, { key, dir: "asc" });
      if (next !== 0) return next;
    }
    return 0;
  });
}
