import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FormatListNumberedOutlinedIcon from "@mui/icons-material/FormatListNumberedOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { Panel } from "@/components/ui/panel.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import { FindingPie } from "./safety-charts.js";
import { type SafetyFinding } from "../types/safety.types.js";
import { findingWeekLabel } from "../utils/finding-no.js";
import { WeekStepper } from "./week-stepper.js";
import type { SafetyStats } from "../types/safety.types.js";

type LineWalkSortKey = "weekNo" | "inspectionDate" | "expectedCompleteDate" | "status" | "location" | "contractor";
type SortDirection = "asc" | "desc";

// Report order: by ISO week, then the week's own number (1..N), then the permanent running number.
const byNo = (a: SafetyFinding, b: SafetyFinding) => a.weekStart.localeCompare(b.weekStart) || a.weekNo - b.weekNo || a.itemNo - b.itemNo;

// Toolbar sort: one select for the field (English labels, per the language policy); the direction
// still comes from the column header arrows.
const SORT_FIELDS: { value: LineWalkSortKey; label: string }[] = [
  { value: "inspectionDate", label: "Inspection date" },
  { value: "weekNo", label: "No." },
  { value: "status", label: "Status" },
  { value: "expectedCompleteDate", label: "Expect complete" },
];

export function LineWalkTab({
  s,
  colors,
  visibleRows,
  removing,
  from,
  to,
  onRangeChange,
  renumber,
  onAdd,
  onEdit,
  onDelete,
}: {
  s: SafetyStats;
  colors: Map<string, string>;
  visibleRows: SafetyFinding[];
  removing: boolean;
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
  /** «Renumber week», shown only when numbers have gaps / are out of date order. `hint` = why it cannot be used yet (null = ready). */
  renumber: { show: boolean; hint: string | null; pending: boolean; onClick: () => void };
  onAdd: () => void;
  onEdit: (finding: SafetyFinding) => void;
  onDelete: (finding: SafetyFinding) => void;
}) {
  const [sortKey, setSortKey] = useState<LineWalkSortKey>("weekNo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const handleSort = (key: LineWalkSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    return [...visibleRows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "weekNo") {
        cmp = byNo(a, b);
      } else if (sortKey === "inspectionDate") {
        cmp = a.inspectionDate.localeCompare(b.inspectionDate);
        if (cmp === 0) cmp = byNo(a, b);
      } else if (sortKey === "expectedCompleteDate") {
        if (!a.expectedCompleteDate && !b.expectedCompleteDate) cmp = byNo(a, b);
        else if (!a.expectedCompleteDate) cmp = 1;
        else if (!b.expectedCompleteDate) cmp = -1;
        else {
          cmp = a.expectedCompleteDate.localeCompare(b.expectedCompleteDate);
          if (cmp === 0) cmp = byNo(a, b);
        }
      } else if (sortKey === "status") {
        const order = { open: 0, done: 1 };
        cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
        if (cmp === 0) cmp = byNo(a, b);
      } else if (sortKey === "location") {
        cmp = (a.buildingCode ?? "").localeCompare(b.buildingCode ?? "");
        if (cmp === 0) cmp = byNo(a, b);
      } else if (sortKey === "contractor") {
        cmp = (a.contractorCode ?? "").localeCompare(b.contractorCode ?? "");
        if (cmp === 0) cmp = byNo(a, b);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [visibleRows, sortKey, sortDir]);

  const weekLabel = useMemo(() => findingWeekLabel(visibleRows), [visibleRows]);

  return (
    <Stack spacing={2.5}>
      <Panel fill title="Finding for line walk" subtitle="แยกตามผู้รับเหมาในช่วงที่เลือก">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FindingPie title="Unsafe Action" summary={s.unsafeAct} colors={colors} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FindingPie title="Unsafe Condition" summary={s.unsafeCondition} colors={colors} />
          </Grid>
        </Grid>
      </Panel>

      <Panel
        fill
        title="Issue Safety Line Walk"
        subtitle={`${visibleRows.length} รายการ · ${visibleRows.filter((r) => r.status === "open").length} ยังไม่ปิด`}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <WeekStepper from={from} to={to} onChange={onRangeChange} />
            <TextField
              select
              size="small"
              label="Sort by"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as LineWalkSortKey);
                setSortDir("asc");
              }}
              sx={{ width: 172, flex: "none", "& .MuiInputBase-root": { height: 36, fontSize: "0.875rem" } }}
            >
              {SORT_FIELDS.map((f) => (
                <MenuItem key={f.value} value={f.value}>
                  {f.label}
                </MenuItem>
              ))}
            </TextField>
            {renumber.show && (
              <Tooltip title={renumber.hint ?? "เลขมีช่องว่างหรือไม่เรียงตามวันที่ตรวจ — กดเพื่อจัดใหม่เป็น 1..N"}>
                {/* span keeps the tooltip working while the button is disabled */}
                <span>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<FormatListNumberedOutlinedIcon />}
                    disabled={Boolean(renumber.hint) || renumber.pending}
                    onClick={renumber.onClick}
                  >
                    Renumber week
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => onAdd()}>
              Add line walk
            </Button>
          </Stack>
        }
      >
        {sortedRows.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptySection
              dense
              icon={<HealthAndSafetyOutlinedIcon />}
              title="ยังไม่มี Line walk ในช่วงนี้"
              description="กด “Add line walk” เพื่อบันทึกสิ่งที่พบจากการเดินตรวจ"
            />
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 1160, "& td": { verticalAlign: "top" } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>Week</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "weekNo"}
                      direction={sortKey === "weekNo" ? sortDir : "asc"}
                      onClick={() => handleSort("weekNo")}
                    >
                      No.
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                    Observations Identified
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "location"}
                      direction={sortKey === "location" ? sortDir : "asc"}
                      onClick={() => handleSort("location")}
                    >
                      Location
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                    Action to be taken
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "contractor"}
                      direction={sortKey === "contractor" ? sortDir : "asc"}
                      onClick={() => handleSort("contractor")}
                    >
                      Responsible
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "inspectionDate"}
                      direction={sortKey === "inspectionDate" ? sortDir : "asc"}
                      onClick={() => handleSort("inspectionDate")}
                    >
                      Inspection
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "expectedCompleteDate"}
                      direction={sortKey === "expectedCompleteDate" ? sortDir : "asc"}
                      onClick={() => handleSort("expectedCompleteDate")}
                    >
                      Expect complete
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }}>Finding</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
                    <TableSortLabel
                      active={sortKey === "status"}
                      direction={sortKey === "status" ? sortDir : "asc"}
                      onClick={() => handleSort("status")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }}>Close</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "grey.50" }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{weekLabel(r)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.weekNo}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{r.observation}</TableCell>
                    <TableCell>
                      {r.buildingCode ?? "—"}
                      {r.locationDetail ? <Typography variant="caption" sx={{ display: "block" }}>{r.locationDetail}</Typography> : null}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>{r.actionToBeTaken}</TableCell>
                    <TableCell>{r.contractorCode ? <ContractorBadge code={r.contractorCode} title={r.contractorName ?? undefined} /> : "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(r.inspectionDate).format("D/MMM/YY")}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.expectedCompleteDate ? dayjs(r.expectedCompleteDate).format("D/MMM/YY") : "—"}</TableCell>
                    <TableCell>
                      <Thumb src={r.findingPhotoUrl} />
                    </TableCell>
                    <TableCell>
                      {r.status === "done" ? <StatusChip status="completed" label="DONE" /> : <StatusChip status="attention" label="OPEN" />}
                    </TableCell>
                    <TableCell>
                      <Thumb src={r.closePhotoUrl} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{r.findingType === "unsafe_act" ? "Unsafe Act." : "Unsafe con."}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" aria-label="Edit" onClick={() => onEdit(r)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Delete"
                        disabled={removing}
                        onClick={() => onDelete(r)}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Panel>
    </Stack>
  );
}

function Thumb({ src }: { src: string | null }) {
  if (!src) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Box component="a" href={src} target="_blank" rel="noopener" sx={{ display: "block" }}>
      <Box component="img" src={src} alt="" sx={{ width: 96, height: 72, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }} />
    </Box>
  );
}

