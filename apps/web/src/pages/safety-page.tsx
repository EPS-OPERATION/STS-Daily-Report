import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { ContractorBadge, addDaysIso, contractorColorMap, mondayOf, todayIso } from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import {
  FindingDialog,
  FindingPie,
  MonthlyTrendChart,
  StatisticTable,
  useDeleteFinding,
  useSafetyFindings,
  useSafetyStats,
  type SafetyFinding,
} from "@/features/safety/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Safety: EPS line walk entry + statistics from contractor reports + PDF export
// (Issue Safety Line Walk table and Safety Weekly Report statistic).
export function SafetyPage() {
  const [params, setParams] = useSearchParams();
  const monday = mondayOf(todayIso());
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : monday;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : addDaysIso(monday, 6);
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const { projectId } = useCurrentProject();
  const stats = useSafetyStats(projectId, from, to);
  const findings = useSafetyFindings(projectId, from, to);
  const remove = useDeleteFinding(projectId);
  const [editing, setEditing] = useState<SafetyFinding | "new" | null>(null);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const s = stats.data?.data;
  const rows = findings.data?.data ?? [];
  const colors = contractorColorMap(rows.map((r) => r.contractorCode ?? "ไม่ระบุ"));
  const error = [stats.error, findings.error, remove.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  return (
    <Box>
      <PageHeader
        title="Safety"
        subtitle="Line walk (EPS) · สถิติอุบัติเหตุจากรายงานผู้รับเหมา · Export รายงาน PDF"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={400} onChange={setRange} />
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfOutlinedIcon />}
              onClick={() => window.open(`/safety/report?from=${from}&to=${to}`, "_blank", "noopener")}
            >
              Export PDF
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      ) : null}

      {!s ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <Stack spacing={2.5}>
          {/* tiles (deck "SAFETY PERFORMANCE") */}
          <Grid container spacing={1.5}>
            <Tile label="อุบัติเหตุ" value={s.tiles.accidents} unit="ครั้ง" alert={s.tiles.accidents > 0} />
            <Tile label="LTI" value={s.tiles.lti} unit="ครั้ง" alert={s.tiles.lti > 0} />
            <Tile label="Near Miss" value={s.tiles.nearMiss} unit="รายการ" />
            <Tile label="ตรวจความปลอดภัย" value={s.tiles.inspections} unit="ครั้ง" />
            <Tile
              label="ข้อประเด็นแก้ไข"
              value={s.tiles.closedPct === null ? "—" : `${s.tiles.closedPct}%`}
              unit={`(${s.tiles.closed}/${s.tiles.inspections})`}
            />
            <Tile label="อุบัติเหตุเป็นศูนย์" value={s.daysWithoutAccident} unit="วัน" good icon={<HealthAndSafetyOutlinedIcon />} />
          </Grid>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Panel title="STATISTIC" note="จากรายงานบ่ายของผู้รับเหมา (ประเภทเหตุการณ์) + ชั่วโมงทำงาน">
                <StatisticTable stats={s} compact />
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Panel title={`แนวโน้มความปลอดภัย (รายเดือน ${s.to.slice(0, 4)})`} note="Near miss จากผู้รับเหมา · Safety inspection = Line walk ของ EPS">
                <MonthlyTrendChart stats={s} height={300} />
              </Panel>
            </Grid>
            <Grid size={12}>
              <Panel title="Finding for line walk" note="แยกตามผู้รับเหมาในช่วงที่เลือก">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FindingPie title="Unsafe Action" summary={s.unsafeAct} colors={colors} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FindingPie title="Unsafe Condition" summary={s.unsafeCondition} colors={colors} />
                  </Grid>
                </Grid>
              </Panel>
            </Grid>
          </Grid>

          <Panel
            title="Issue Safety Line Walk"
            note={`${rows.length} รายการ · ${rows.filter((r) => r.status === "open").length} ยังไม่ปิด`}
            action={
              <Button startIcon={<AddIcon />} onClick={() => setEditing("new")}>
                บันทึก Line walk
              </Button>
            }
          >
            {rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                ยังไม่มี Line walk ในช่วงนี้
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1100, "& td": { verticalAlign: "top" } }}>
                  <TableHead>
                    <TableRow>
                      {["#", "Observations Identified", "Location", "Action to be taken", "Responsible", "Inspection", "Expect complete", "Finding", "Status", "Close", "Type", ""].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.itemNo}</TableCell>
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
                          <IconButton size="small" aria-label="แก้ไข" onClick={() => setEditing(r)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="ลบ"
                            disabled={remove.isPending}
                            onClick={() => window.confirm(`ลบ item ${r.itemNo}?`) && remove.mutate(r.id)}
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
      )}

      {editing && projectId ? (
        <FindingDialog projectId={projectId} finding={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </Box>
  );
}

function Tile({
  label,
  value,
  unit,
  alert,
  good,
  icon,
}: {
  label: string;
  value: number | string;
  unit: string;
  alert?: boolean;
  good?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
      <Box
        sx={{
          height: "100%",
          border: 1,
          borderColor: good ? "success.main" : "divider",
          borderRadius: 2,
          bgcolor: good ? "success.light" : "background.paper",
          p: 1.5,
          textAlign: "center",
        }}
      >
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ color: good ? "success.dark" : "text.secondary" }}>
          {icon}
          <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{ color: alert ? "error.main" : good ? "success.dark" : "text.primary", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {unit}
        </Typography>
      </Box>
    </Grid>
  );
}

function Panel({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          {note ? (
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
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
