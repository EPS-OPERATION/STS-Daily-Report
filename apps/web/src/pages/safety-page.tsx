import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ContractorBadge,
  ContractorFilterPopover,
  addDaysIso,
  contractorColorMap,
  mondayOf,
  todayIso,
} from "@/features/daily-reports/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
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
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import { HttpError } from "@/services/http/client.js";
import { WorkPermitsView } from "./work-permits-page.js";
import { RainLogView } from "@/features/safety/index.js";
import { CONTRACTOR_LEGEND, WORK_PERMITS } from "@/mock/work-permits.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type SafetyTab = "safety" | "permits" | "rain";

// Safety: EPS line walk entry + statistics from contractor reports + PDF export + Work Permits board + Rain delay log.
export function SafetyPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: SafetyTab = rawTab === "permits" ? "permits" : rawTab === "rain" ? "rain" : "safety";

  const setTab = (next: SafetyTab) => {
    const p = new URLSearchParams(params);
    if (next === "safety") {
      p.delete("tab");
    } else {
      p.set("tab", next);
    }
    setParams(p, { replace: true });
  };

  const monday = mondayOf(todayIso());
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : monday;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : addDaysIso(monday, 6);
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
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
  const rows: SafetyFinding[] = findings.data?.data ?? [];

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) if (c.code) m.set(c.code, c.name);
    for (const leg of CONTRACTOR_LEGEND) if (!m.has(leg.code)) m.set(leg.code, leg.name);
    for (const r of rows) if (r.contractorCode) m.set(r.contractorCode, r.contractorName || m.get(r.contractorCode) || "");
    return m;
  }, [projectContractors, rows]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.contractorCode) set.add(r.contractorCode);
    if (tab === "permits") for (const p of WORK_PERMITS) set.add(p.contractor);
    for (const c of projectContractors) if (c.code) set.add(c.code);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows, tab, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);

  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);

  const filterItems = useMemo(() => {
    return allCodes.map((code: string) => {
      const n =
        tab === "permits"
          ? WORK_PERMITS.filter((p) => p.contractor === code).length
          : rows.filter((r) => r.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? "#999",
        countLabel: tab === "permits" ? `${n} ใบ` : `${n} รายการ`,
      };
    });
  }, [allCodes, tab, rows, contractorNames, colors]);

  const visibleRows: SafetyFinding[] = useMemo(
    () => rows.filter((r) => !r.contractorCode || selectedCodes.has(r.contractorCode)),
    [rows, selectedCodes],
  );

  const error = [stats.error, findings.error, remove.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  return (
    <Box>
      <PageHeader
        title={tab === "permits" ? "Work Permits" : tab === "rain" ? "Rain & Delay Log" : "Safety"}
        subtitle={
          tab === "permits"
            ? "High-risk permit register · ทะเบียนและสถิติใบอนุญาตทำงานความเสี่ยงสูง"
            : tab === "rain"
              ? "บันทึกเวลาฝนตกจริง · สถิติชั่วโมงสั่งหยุดงาน · หลักฐานประกอบการต่อรอง Delay (EOT Claim) กับ PM"
              : "Line walk (EPS) · สถิติอุบัติเหตุจากรายงานผู้รับเหมา · Export รายงาน PDF"
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {(tab === "safety" || tab === "rain") && (
              <DateRangeFields from={from} to={to} maxDays={400} onChange={setRange} />
            )}
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            )}
            {tab === "safety" && (
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfOutlinedIcon />}
                onClick={() => {
                  const p = new URLSearchParams({ from, to });
                  if (selectedCodes.size < allCodes.length) p.set("contractors", [...selectedCodes].join(","));
                  window.open(`/safety/report?${p.toString()}`, "_blank", "noopener");
                }}
              >
                Export PDF
              </Button>
            )}
          </Stack>
        }
      />

      <ToggleButtonGroup
        exclusive
        size="small"
        value={tab}
        onChange={(_, v: SafetyTab | null) => v && setTab(v)}
        aria-label="มุมมอง Safety & Work Permits"
        sx={{ mb: 2.5, bgcolor: "background.paper" }}
      >
        <ToggleButton value="safety" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <HealthAndSafetyOutlinedIcon fontSize="small" />
          Safety Overview
        </ToggleButton>
        <ToggleButton value="permits" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          Work Permits
        </ToggleButton>
        <ToggleButton value="rain" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <ThunderstormOutlinedIcon fontSize="small" />
          สถิติฝนตก
        </ToggleButton>
      </ToggleButtonGroup>

      {tab === "permits" ? (
        <WorkPermitsView selectedContractorCodes={selectedCodes} />
      ) : tab === "rain" ? (
        <RainLogView projectId={projectId ?? ""} from={from} to={to} />
      ) : (
        <>

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
                note={`${visibleRows.length} รายการ · ${visibleRows.filter((r) => r.status === "open").length} ยังไม่ปิด`}
                action={
                  <Button startIcon={<AddIcon />} onClick={() => setEditing("new")}>
                    บันทึก Line walk
                  </Button>
                }
              >
                {visibleRows.length === 0 ? (
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
                        {visibleRows.map((r) => (
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
        </>
      )}
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
