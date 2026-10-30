import AddIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { alpha } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { PermitType } from "@sts/shared";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import { PERMIT_ICONS, permitLabel } from "@/features/daily-requests/index.js";
import { PermitNoticeThumbs, useDailyRequests, usePermitNotices } from "@/features/daily-requests/index.js";
import type { PermitEditItem } from "./permit-edit-dialog.js";

export interface HighRiskTask {
  key: string;
  date: string;
  contractorCode: string;
  contractorName: string;
  taskName: string;
  supervisors: string[];
  permitTypes: PermitType[];
  buildings: string[];
  workers: number;
  /** The permits behind the card (one per permit type), for editing. */
  permits: PermitEditItem[];
}

// "งานที่มีความเสี่ยงสูงและการควบคุม": permits the contractor marked high-risk in the afternoon
// report (for the next working day), one card per contractor × day × task name — several permits
// with the same task name (e.g. Lifting + Work at Height) are one job.
export function HighRiskTasks({
  projectId,
  from,
  to,
  selectedContractorCodes,
  onEdit,
  onAdd,
}: {
  projectId: string | null;
  from: string;
  to: string;
  selectedContractorCodes?: Set<string>;
  /** EPS only: the ✎ on a card opens the permit edit dialog. */
  onEdit?: (permit: PermitEditItem) => void;
  /** EPS only: the dashed ➕ card at the end of each day adds a task on that day. */
  onAdd?: (date: string) => void;
}) {
  const query = useDailyRequests(projectId, from, to);
  // Location photos of the permits (floor cut open, guardrail removed...), shown on the job's card.
  const notices = usePermitNotices(projectId, from, to);
  const photosByPermit = useMemo(() => new Map((notices.data?.data ?? []).map((n) => [n.id, n.photos])), [notices.data]);

  const realTasksByDate = useMemo(() => {
    const tasks = new Map<string, HighRiskTask>();
    for (const p of query.data?.data.permits ?? []) {
      if (!p.highRisk || !p.taskName) continue;
      if (selectedContractorCodes && !selectedContractorCodes.has(p.contractorCode)) continue;
      const key = `${p.targetDate}|${p.contractorCode}|${p.taskName.trim().toLowerCase()}`;
      const t =
        tasks.get(key) ??
        tasks
          .set(key, {
            key,
            date: p.targetDate,
            contractorCode: p.contractorCode,
            contractorName: p.contractorName,
            taskName: p.taskName.trim(),
            supervisors: [],
            permitTypes: [],
            buildings: [],
            workers: 0,
            permits: [],
          })
          .get(key)!;
      if (p.supervisorName && !t.supervisors.includes(p.supervisorName)) t.supervisors.push(p.supervisorName);
      if (!t.permitTypes.includes(p.permitType)) t.permitTypes.push(p.permitType);
      t.permits.push(p);
      if (!t.buildings.includes(p.buildingName)) t.buildings.push(p.buildingName);
      // The same crew usually holds every permit of the job — show the largest, not the sum.
      t.workers = Math.max(t.workers, p.workers);
    }
    const days = new Map<string, HighRiskTask[]>();
    for (const t of [...tasks.values()].sort((a, b) => a.date.localeCompare(b.date) || a.contractorCode.localeCompare(b.contractorCode))) {
      days.set(t.date, [...(days.get(t.date) ?? []), t]);
    }
    return [...days];
  }, [query.data, selectedContractorCodes]);

  const byDate = realTasksByDate;

  if (query.isError) return <Alert severity="error">โหลดงานความเสี่ยงสูงไม่สำเร็จ</Alert>;
  if (!query.data) return <BlockSkeleton height={120} />;
  if (byDate.length === 0) {
    return <EmptySection dense icon={<WarningAmberRoundedIcon />} title="ไม่มีงานที่ผู้รับเหมาแจ้งว่าเป็นงานความเสี่ยงสูงในช่วงนี้" description="งานจะขึ้นที่นี่เมื่อผู้รับเหมาติ๊ก High-risk ในใบขออนุญาตของรายงานบ่าย" />;
  }

  const multiDay = byDate.length > 1 || from !== to;
  return (
    <Stack spacing={1.5} sx={{ maxHeight: 340, overflowY: "auto", pr: 0.5 }}>
      {byDate.map(([date, tasks]) => (
        <Box key={date}>
          {multiDay ? (
            // Day header stays at the top while its cards scroll under it.
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, py: 0.5, mb: 0.5, color: "text.secondary", position: "sticky", top: 0, zIndex: 1, bgcolor: "background.paper" }}
            >
              {dayjs(date).format("ddd D MMM YYYY")} · {tasks.length} งาน
            </Typography>
          ) : null}
          <Grid container spacing={1.25}>
            {tasks.map((t) => (
              <Grid key={t.key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <TaskCard task={t} onEdit={onEdit} photos={t.permits.flatMap((p) => photosByPermit.get(p.id) ?? [])} />
              </Grid>
            ))}
            {onAdd ? (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <AddCard onClick={() => onAdd(date)} />
              </Grid>
            ) : null}
          </Grid>
        </Box>
      ))}
    </Stack>
  );
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-label="เพิ่มงานความเสี่ยงสูงวันนี้"
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 120,
        borderRadius: 1.5,
        border: "1.5px dashed",
        borderColor: "#E7B67A",
        color: "#9A5B13",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        "&:hover": { bgcolor: "#FFF8EC" },
      }}
    >
      <AddIcon />
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        เพิ่มงานเสี่ยงสูง
      </Typography>
      <Typography variant="caption" color="text.secondary">
        ผู้รับเหมาไม่ได้แจ้ง / แจ้งผิด
      </Typography>
    </ButtonBase>
  );
}

function TaskCard({ task, onEdit, photos }: { task: HighRiskTask; onEdit?: (permit: PermitEditItem) => void; photos: { id: string; fileName: string; url: string | null }[] }) {
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        p: 1.25,
        borderRadius: 1.5,
        bgcolor: (t) => alpha(t.palette.warning.light, 0.6),
        border: "1px solid",
        borderColor: (t) => alpha(t.palette.warning.main, 0.35),
        boxShadow: "0 1px 2px rgba(120, 72, 0, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      {onEdit ? (
        <>
          <Tooltip title="แก้ไขงานนี้">
            <IconButton
              size="small"
              aria-label={`แก้ไข ${task.taskName}`}
              onClick={(e) => (task.permits.length === 1 ? onEdit(task.permits[0]!) : setMenu(e.currentTarget))}
              sx={{ position: "absolute", top: 4, right: 4, bgcolor: "#fff", border: "1px solid #F2D4A6", "&:hover": { bgcolor: "#fff" } }}
            >
              <EditOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          {/* One job can hold several permits (e.g. Lifting + Work at Height): pick which one to edit. */}
          <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
            {task.permits.map((p) => (
              <MenuItem
                key={p.id}
                onClick={() => {
                  setMenu(null);
                  onEdit(p);
                }}
              >
                แก้ไข {permitLabel(p.permitType)} · {p.workers} คน
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}
      {/* header: warning icons per permit type */}
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
        {task.permitTypes.map((p) => {
          const Icon = PERMIT_ICONS[p];
          return (
            <Tooltip key={p} title={permitLabel(p)}>
              <Box sx={{ position: "relative", display: "inline-flex", color: "warning.dark" }}>
                <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />
                <Icon sx={{ position: "absolute", right: -5, bottom: -2, fontSize: 13, bgcolor: "warning.light", borderRadius: "50%", color: "warning.dark" }} />
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
      <Typography sx={{ fontWeight: 700, fontSize: "1rem", textAlign: "center", lineHeight: 1.25, px: onEdit ? 3.5 : 0 }} noWrap title={task.taskName}>
        {task.taskName}
      </Typography>
      <Box sx={{ alignSelf: "center", px: 1, py: 0.25, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.18), textAlign: "center" }}>
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
          ผู้ควบคุม (EPS) : {task.supervisors.join(", ") || "—"}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="center">
        {task.permitTypes.map((p) => (
          <Chip key={p} size="small" label={permitLabel(p)} variant="outlined" sx={{ height: 22, fontSize: 11, borderColor: "#E7B67A", bgcolor: "#fff" }} />
        ))}
      </Stack>
      {photos.length ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PermitNoticeThumbs photos={photos} size={56} />
        </Box>
      ) : null}
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ mt: "auto", pt: 0.25 }}>
        <ContractorBadge code={task.contractorCode} />
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.8rem" }}>
          {task.buildings.join(", ")} · {task.workers} คน
        </Typography>
      </Stack>
    </Box>
  );
}
