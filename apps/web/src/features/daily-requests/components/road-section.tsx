import { ContractorBadge } from "@/features/contractors/index.js";
import { RoadStatusChip } from "../components/road-status-chip.js";
import { RoadTimeDialog } from "../components/road-time-dialog.js";
import { RoadTimelines } from "../components/road-timeline.js";
import { roadPlacesMeet } from "@sts/shared";
import { toast } from "sonner";
import { HttpError } from "@/services/http/client.js";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { Section } from "../components/today-requests-parts.js";
import { SimpleTable } from "../components/today-requests-parts.js";
import type { UseTodayRequestsState } from "../hooks/use-today-requests.js";

export function RoadSection({ ed }: { ed: UseTodayRequestsState }) {
  const { allRoads, canEdit, adjustRoad, editing, setEditing, dayCol, dayHead, dayRoads, dayAllRoads } = ed;
  return (
    <Section title="Road usage">
      <RoadTimelines
        allRoads={dayAllRoads}
        visibleIds={new Set(dayRoads.map((r) => r.id))}
        canEdit={canEdit}
        onEdit={setEditing}
      />
      <SimpleTable
        empty="ไม่มีการขอใช้/ปิดถนน"
        emptyIcon={<RouteOutlinedIcon />}
        head={[...dayHead, "Road / lane", "Time", "Contractor", "Next to", "วัตถุประสงค์", ...(canEdit ? [""] : [])]}
        rows={dayRoads.map((r) => ({
          key: r.id,
          tone: r.conflict ? ("error" as const) : undefined,
          cells: [
            ...dayCol(r.targetDate),
            <Stack key="r" direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <b>{r.roadLocation}</b>
              <RoadStatusChip clash={r.conflict} adjusted={r.adjusted} />
            </Stack>,
            r.adjusted ? (
              <span key="t" style={{ fontVariantNumeric: "tabular-nums" }}>
                <s>{r.requestedStartTime}–{r.requestedEndTime}</s> <b>{r.startTime}–{r.endTime}</b>
              </span>
            ) : (
              `${r.startTime}–${r.endTime}`
            ),
            <ContractorBadge key="c" code={r.contractorCode} />,
            r.buildingName,
            r.purpose,
            ...(canEdit
              ? [
                  <IconButton key="e" size="small" aria-label={`Edit time ${r.contractorCode} ${r.roadLocation}`} onClick={() => setEditing(r)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>,
                ]
              : []),
          ],
        }))}
      />
      <RoadTimeDialog
        key={editing?.id ?? "none"}
        road={editing}
        bookings={
          editing
            ? allRoads.filter(
                (r) => r.targetDate === editing.targetDate && (r.id === editing.id || roadPlacesMeet(r, editing)),
              )
            : []
        }
        saving={adjustRoad.isPending}
        error={adjustRoad.isError ? (adjustRoad.error instanceof HttpError ? adjustRoad.error.message : "บันทึกเวลาไม่สำเร็จ") : null}
        onClose={() => {
          setEditing(null);
          adjustRoad.reset();
        }}
        onSave={(startTime, endTime) => {
          if (!editing) return;
          adjustRoad.mutate(
            { id: editing.id, startTime, endTime },
            { onSuccess: () => { toast.success("บันทึกเวลาแล้ว"); setEditing(null); } },
          );
        }}
        onRestore={() => {
          if (!editing) return;
          adjustRoad.mutate(
            { id: editing.id, startTime: editing.requestedStartTime, endTime: editing.requestedEndTime },
            { onSuccess: () => { toast.success("คืนเวลาที่ขอแล้ว"); setEditing(null); } },
          );
        }}
      />
    </Section>
  );
}
