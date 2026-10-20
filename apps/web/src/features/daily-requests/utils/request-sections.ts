import type { ExportSection } from "./report-export.js";
import type { DailyRequests } from "../types/daily-request.types.js";
import type { InspectionRequest } from "@/features/qaqc/index.js";
import { formatThaiDate } from "@/lib/dates.js";

type Rows = {
  machines: DailyRequests["machinery"];
  equipment: DailyRequests["equipmentRequests"];
  roads: DailyRequests["roads"];
  inspections: InspectionRequest[];
  contractorNames: Map<string, string>;
};

// Print / CSV: every request in the range for the chosen contractors, one table per kind.
export function buildRequestSections({ machines, equipment, roads, inspections, contractorNames }: Rows, forPrint = false): ExportSection[] {
  const who = (r: { contractorCode: string; contractorName?: string }) => `${r.contractorCode} ${r.contractorName ?? contractorNames.get(r.contractorCode) ?? ""}`.trim();
  const d = (isoDate: string) => (forPrint ? formatThaiDate(isoDate) : isoDate);
  // Machine/equipment sheets only when there are such (older) requests in range.
  const sections: ExportSection[] = [
    { title: "เครื่องจักร (Machinery)", head: ["วันที่", "ผู้รับเหมา", "เครื่องจักร", "หมายเลข", "เวลา", "พื้นที่", "วัตถุประสงค์"],
      rows: machines.map((m) => [d(m.targetDate), who(m), m.machineType, m.unitTag, m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : "ทั้งวัน", `${m.buildingCode} ${m.buildingName}`, m.purpose]) },
    { title: "อุปกรณ์ (Equipment)", head: ["วันที่", "ผู้รับเหมา", "อุปกรณ์", "จำนวน", "พื้นที่", "วัตถุประสงค์"],
      rows: equipment.map((e) => [d(e.targetDate), who(e), e.equipmentType, e.qty, `${e.buildingCode} ${e.buildingName}`, e.purpose]) },
    { title: "ขอใช้ / ปิดถนน (Road usage)", head: ["วันที่", "ผู้รับเหมา", "ถนน", "เวลา", "วัตถุประสงค์", "สถานะ"],
      rows: roads.map((r) => [d(r.targetDate), who(r), r.roadLocation, `${r.startTime}–${r.endTime}`, r.purpose, [r.conflict ? "ชนกัน" : "", r.adjusted ? `EPS ปรับเวลา (ขอ ${r.requestedStartTime}–${r.requestedEndTime})` : ""].filter(Boolean).join(" · ")]) },
    { title: "QAQC (ขอตรวจ)", head: ["วันที่ตรวจ", "เวลา", "ผู้รับเหมา", "ประเภท", "งาน", "พื้นที่", "สถานะ", "ผล"],
      rows: inspections.map((i) => [d(i.inspectionDate), i.inspectionTime, who(i), i.inspectionType, i.workItem, [`${i.buildingCode} ${i.buildingName}`, i.location].filter(Boolean).join(" · "), i.status, i.result]) },
  ];
  return sections.filter((x, i) => i > 1 || x.rows.length > 0);
}
