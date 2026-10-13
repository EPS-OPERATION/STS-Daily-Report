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
