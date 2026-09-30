import AddRoadOutlinedIcon from "@mui/icons-material/AddRoadOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType, ReactNode } from "react";
import type { PlannedToday } from "../types/daily-report.types.js";
import { PERMIT_ICONS, permitLabel } from "./permit-meta.js";
import { RequestStatusChip } from "./request-chips.js";
import { inspectionTypeLabel } from "./request-section.js";

// Read-only checklist on the morning check-in: what was requested yesterday evening
// for today. Changes go through tomorrow's evening form, not here.
export function PlannedTodayChecklist({ planned }: { planned: PlannedToday }) {
  const empty =
    planned.machinery.length + planned.permits.length + planned.roads.length + planned.inspections.length === 0;
  if (empty) {
    return (
      <Typography variant="body2" color="text.secondary">
        ไม่มีคำขอสำหรับวันนี้ (คำขอต้องส่งในรายงานเย็นของเมื่อวาน)
      </Typography>
    );
  }
  return (
    <Stack spacing={1.25}>
      {planned.inspections.map((r) => (
        <Line key={r.id} icon={FactCheckOutlinedIcon} time={r.inspectionTime} trailing={<RequestStatusChip status={r.status} result={r.result} />}>
          QAQC · {inspectionTypeLabel(r.inspectionType)} · {r.workItem} · {r.buildingName}
        </Line>
      ))}
      {planned.machinery.map((m) => (
        <Line key={m.id} icon={PrecisionManufacturingOutlinedIcon} time={`${m.startTime}–${m.endTime}`}>
          {m.machineType}
          {m.unitTag ? ` (${m.unitTag})` : ""} · {m.buildingName}
        </Line>
      ))}
      {planned.roads.map((r) => (
        <Line key={r.id} icon={AddRoadOutlinedIcon} time={`${r.startTime}–${r.endTime}`}>
          {r.roadLocation} · {r.purpose}
        </Line>
      ))}
      {planned.permits.map((p) => (
        <Line key={p.id} icon={PERMIT_ICONS[p.permitType]} time="PTW">
          {p.permitType === "other" ? p.otherLabel : permitLabel(p.permitType)} · {p.buildingName} · {p.workers} คน
        </Line>
      ))}
    </Stack>
  );
}

function Line({
  icon: Icon,
  time,
  trailing,
  children,
}: {
  icon: ComponentType<SvgIconProps>;
  time: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Icon sx={{ color: "primary.main", fontSize: 20 }} />
      <Box sx={{ minWidth: 86 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {time}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
        {children}
      </Typography>
      {trailing}
    </Stack>
  );
}
