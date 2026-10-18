import { Link as RouterLink } from "react-router-dom";
import { inspectionTypeLabel } from "@/features/qaqc/index.js";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Link from "@mui/material/Link";
import { Section } from "../components/today-requests-parts.js";
import { SimpleTable } from "../components/today-requests-parts.js";
import type { UseTodayRequestsState } from "../hooks/use-today-requests.js";

export function QaqcSection({ ed }: { ed: UseTodayRequestsState }) {
  const { dayCol, dayHead, dayInspections } = ed;
  return (
    <Section
      title="QAQC inspections"
      action={
        <Link component={RouterLink} to="/qaqc" underline="always" variant="body2">
          Open QAQC board
        </Link>
      }
    >
      <SimpleTable
        empty="ไม่มีคำขอตรวจ"
        emptyIcon={<FactCheckOutlinedIcon />}
        head={[...dayHead, "Type", "Time", "Contractor", "Work item", "Building"]}
        rows={dayInspections.map((r) => ({
          key: r.id,
          cells: [
            ...dayCol(r.inspectionDate),
            "RFI",
            r.inspectionTime,
            <b key="c">{r.contractorName}</b>,
            r.inspectionType && r.inspectionType !== "other"
              ? `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`
              : r.workItem,
            r.buildingCode,
          ],
        }))}
      />
    </Section>
  );
}
