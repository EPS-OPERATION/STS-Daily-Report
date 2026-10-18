import type { DailyRequests } from "@/features/daily-requests/index.js";
import type { InspectionRequest } from "@/features/qaqc/index.js";

export const PERMIT_LABEL: Record<string, string> = {
  hot_work: "งานประกายไฟ (Hot work)",
  confined_space: "ที่อับอากาศ (Confined space)",
  height: "งานที่สูง (Height)",
  lifting: "งานยก (Lifting)",
  excavation: "งานขุด (Excavation)",
  radiation: "งานรังสี (Radiation)",
  electrical: "ระบบไฟฟ้า (Electrical)",
  chemical: "สารเคมี (Chemical)",
  other: "อื่นๆ (Other)",
};

export interface Highlight {
  id: string;
  title: string;
  lines: string[];
  tone: "error" | "warning" | "info" | "success";
}

// Today's highlight list: road clashes first, then permits, machinery, QAQC inspections, other roads and forecasts.
export function buildHighlights({
  requests,
  inspections,
  today,
  selectedCodes,
}: {
  requests: DailyRequests | undefined;
  inspections: InspectionRequest[];
  today: string;
  selectedCodes: Set<string>;
}): Highlight[] {
  if (!requests) return [];
  const { roads: reqRoads, permits: reqPermits, machinery: reqMachinery, forecasts: reqForecasts } = requests;
  const rfiRows = inspections;
  const items: Highlight[] = [];

  // 1. Road clashes (High priority error)
  reqRoads
    .filter((r) => r.conflict && selectedCodes.has(r.contractorCode))
    .forEach((r) => {
      items.push({
        id: `road-conflict-${r.id}`,
        title: `แจ้งเตือนถนนทับซ้อน: ${r.roadLocation}`,
        lines: [`ผู้รับเหมา ${r.contractorCode}`, `${r.startTime} – ${r.endTime} น.`, r.purpose || "ขอใช้ทาง"],
        tone: "error",
      });
    });

  // 2. High-risk permits
  reqPermits
    .filter((p) => selectedCodes.has(p.contractorCode))
    .forEach((p) => {
      items.push({
        id: `permit-${p.id}`,
        title: `Work Permit: ${PERMIT_LABEL[p.permitType] ?? p.permitType} · ${p.buildingName || p.buildingCode}`,
        lines: [`ผู้รับเหมา ${p.contractorCode}`, `จำนวน ${p.workers} คน`],
        tone: "warning",
      });
    });

  // 3. Machinery bookings
  reqMachinery
    .filter((m) => selectedCodes.has(m.contractorCode))
    .forEach((m) => {
      items.push({
        id: `machinery-${m.id}`,
        title: `จองเครื่องจักร: ${m.machineType}${m.unitTag ? ` (${m.unitTag})` : ""} · ${m.buildingCode}`,
        lines: [
          `ผู้รับเหมา ${m.contractorCode}`,
          m.startTime && m.endTime ? `${m.startTime} – ${m.endTime} น.` : "ตลอดวัน",
          m.purpose || "ใช้งานตามแผน",
        ],
        tone: "info",
      });
    });

  // 4. QAQC Today inspections
  rfiRows
    .filter((r) => r.inspectionDate === today && selectedCodes.has(r.contractorCode))
    .forEach((r) => {
      items.push({
        id: `rfi-${r.id}`,
        title: `QAQC ตรวจงาน: ${r.workItem || r.inspectionType} · ${r.buildingCode}`,
        lines: [`ผู้รับเหมา ${r.contractorCode}`, `เวลา ${r.inspectionTime || "ตามนัดหมาย"}`, r.drawingRef ? `แบบ ${r.drawingRef}` : ""].filter(Boolean),
        tone: "success",
      });
    });

  // 5. Normal road usage
  reqRoads
    .filter((r) => !r.conflict && selectedCodes.has(r.contractorCode))
    .forEach((r) => {
      items.push({
        id: `road-${r.id}`,
        title: `ขอใช้ถนน: ${r.roadLocation}`,
        lines: [`ผู้รับเหมา ${r.contractorCode}`, `${r.startTime} – ${r.endTime} น.`, r.purpose || ""].filter(Boolean),
        tone: "info",
      });
    });

  // 6. Forecast Activities
  reqForecasts
    .filter((f) => selectedCodes.has(f.contractorCode))
    .forEach((f) => {
      items.push({
        id: `forecast-${f.id}`,
        title: `แผนงานวันนี้: ${f.description}`,
        lines: [`ผู้รับเหมา ${f.contractorCode}`, f.buildingCode],
        tone: "info",
      });
    });

  return items;
}
