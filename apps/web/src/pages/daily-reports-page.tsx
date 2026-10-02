import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ContractorBadge,
  ReviewDialog,
  formatThaiDate,
  todayIso,
  useInspectionRequests,
  useReviewQueue,
  type InspectionRequest,
  type ReviewQueueRow,
  type ReviewStatus,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ReviewTab = "pending" | "rejected" | "approved" | "all";

// Admin check & Daily Report summary for contractors.
// Supports single day or date range filtering with contractor filter.
export function DailyReportsPage() {
  const [params, setParams] = useSearchParams();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;

  const [search, setSearch] = useState("");
  const [contractor, setContractor] = useState("All Contractors");
  const [tab, setTab] = useState<ReviewTab>("all");
  const [reviewTarget, setReviewTarget] = useState<ReviewQueueRow | null>(null);

  const { projectId } = useCurrentProject();
  const reviewQueue = useReviewQueue(projectId, isRange ? { from, to } : from);
  const inspections = useInspectionRequests(projectId, { from, to, by: "report" });

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const queue: ReviewQueueRow[] = useMemo(() => reviewQueue.data?.data ?? [], [reviewQueue.data]);
  const requestList: InspectionRequest[] = useMemo(() => inspections.data?.data ?? [], [inspections.data]);

  // RFI / NCR counts per contractor from inspection requests
  const contractorStats = useMemo(() => {
    const map = new Map<string, { rfiToday: number; rfiTomorrow: number; ncr: number }>();
    for (const r of requestList) {
      const s = map.get(r.contractorName) ?? { rfiToday: 0, rfiTomorrow: 0, ncr: 0 };
      s.rfiToday += 1;
      if (r.result === "fail") s.ncr += 1;
      map.set(r.contractorName, s);
    }
    return map;
  }, [requestList]);

  const counts = useMemo(() => {
    const totalWorkers = queue.reduce((sum, q) => sum + (q.totalHeadcount ?? 0), 0);
    return {
      total: queue.length,
      totalWorkers,
      pending: queue.filter((q) => q.reviewStatus === "pending").length,
      rejected: queue.filter((q) => q.reviewStatus === "rejected").length,
      approved: queue.filter((q) => q.reviewStatus === "approved").length,
    };
  }, [queue]);

  const contractorNames = useMemo(
    () => [...new Set(queue.map((q) => q.contractorName))].sort(),
    [queue],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue.filter((r) => {
      if (tab !== "all" && r.reviewStatus !== tab) return false;
      if (contractor !== "All Contractors" && r.contractorName !== contractor) return false;
      if (q && !`${r.contractorName} ${r.contractorCode} ${r.reportDate}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [queue, tab, contractor, search]);

  const loadError =
    reviewQueue.error instanceof HttpError
      ? reviewQueue.error.message
      : inspections.error instanceof HttpError
        ? inspections.error.message
        : null;
  const loading = reviewQueue.isPending;

  const shiftChip = (s: "draft" | "submitted") =>
    s === "submitted" ? <StatusChip status="submitted" label="ส่งแล้ว" /> : <StatusChip status="draft" label="รอส่ง" />;

  const statusLabel = (status: ReviewStatus) => {
    if (status === "approved") return "อนุมัติแล้ว";
    if (status === "rejected") return "ตีกลับแก้ไข";
    return "รอตรวจสอบ";
  };

  return (
    <Box>
      <PageHeader
        title="สรุปและตรวจสอบรายงานประจำวัน"
        subtitle="สรุปภาพรวมรายงานประจำวันจากผู้รับเหมา — ข้อมูลหน้างาน กำลังคน ผลงานจริง และการอนุมัติ"
        actions={
          <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
        }
      />

      {!projectId ? (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          กรุณาเลือกโครงการด้านบนเพื่อดูสรุปรายงานประจำวัน
        </Alert>
      ) : loadError ? (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          ไม่สามารถโหลดข้อมูลรายงานได้: {loadError}
        </Alert>
      ) : loading ? (
        <Stack spacing={2} sx={{ mb: 2.5 }}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={260} />
        </Stack>
      ) : (
        <Box sx={{ mb: 2.5 }}>
          {/* Summary KPI Cards */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              {
                label: isRange ? "รายงานทั้งหมดในช่วงเวลา" : "รายงานประจำวันทั้งหมด",
                value: `${counts.total} รายงาน`,
                sub: isRange ? `${formatThaiDate(from)} – ${formatThaiDate(to)}` : formatThaiDate(from),
                color: "text.primary",
              },
              {
                label: "กำลังคนรวมสะสม",
                value: `${counts.totalWorkers.toLocaleString()} คน`,
                sub: `เฉลี่ย ${counts.total > 0 ? Math.round(counts.totalWorkers / counts.total) : 0} คน/รายงาน`,
                color: "primary.main",
              },
              {
                label: "รอตรวจสอบ",
                value: `${counts.pending} รายงาน`,
                sub: counts.pending > 0 ? "มีรายการที่ต้องพิจารณา" : "ตรวจสอบครบแล้ว",
                color: counts.pending > 0 ? "warning.dark" : "text.secondary",
              },
              {
                label: "อนุมัติแล้ว",
                value: `${counts.approved} รายงาน`,
                sub: counts.total > 0 ? `${Math.round((counts.approved / counts.total) * 100)}% ของทั้งหมด` : "0%",
                color: "success.dark",
              },
            ].map((kpi) => (
              <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, my: 0.5 }}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpi.sub}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filter Status Tabs */}
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
            {(
              [
                ["all", `ทั้งหมด (${counts.total})`],
                ["pending", `รอตรวจสอบ (${counts.pending})`],
                ["approved", `อนุมัติแล้ว (${counts.approved})`],
                ["rejected", `ตีกลับแก้ไข (${counts.rejected})`],
              ] as [ReviewTab, string][]
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                clickable
                color={tab === value ? "primary" : "default"}
                variant={tab === value ? "filled" : "outlined"}
                onClick={() => setTab(value)}
              />
            ))}
          </Stack>

          {/* Table Card with Contractor & Search Filters */}
          <Card variant="outlined">
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel id="review-contractor">ผู้รับเหมา</InputLabel>
                  <Select
                    labelId="review-contractor"
                    label="ผู้รับเหมา"
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                  >
                    <MenuItem value="All Contractors">ทุกผู้รับเหมา ({queue.length} รายการ)</MenuItem>
                    {contractorNames.map((c) => {
                      const countForC = queue.filter((q) => q.contractorName === c).length;
                      return (
                        <MenuItem key={c} value={c}>
                          {c} ({countForC})
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <TextField
                  label="ค้นหา"
                  placeholder="ชื่อผู้รับเหมา, รหัส หรือวันที่…"
                  size="small"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Stack>

              {rows.length === 0 ? (
                <EmptyState
                  icon={<FactCheckOutlinedIcon />}
                  title="ไม่มีรายงานที่ตรงกับเงื่อนไข"
                  description="ลองเปลี่ยนช่วงวันที่ ตัวกรองผู้รับเหมา หรือล้างคำค้นหา"
                  action={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setTab("all");
                        setSearch("");
                        setContractor("All Contractors");
                      }}
                    >
                      ดูทั้งหมด
                    </Button>
                  }
                />
              ) : (
                <Table size="small" aria-label="Contractor daily report list">
                  <TableHead>
                    <TableRow>
                      {isRange && <TableCell sx={{ whiteSpace: "nowrap" }}>วันที่</TableCell>}
                      <TableCell>ผู้รับเหมา</TableCell>
                      <TableCell>เช้า</TableCell>
                      <TableCell>เย็น</TableCell>
                      <TableCell align="right">คน</TableCell>
                      <TableCell align="right">RFI</TableCell>
                      <TableCell align="right">NCR</TableCell>
                      <TableCell>สถานะการตรวจ</TableCell>
                      <TableCell align="right">การดำเนินการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      const s = contractorStats.get(r.contractorName) ?? { rfiToday: 0, rfiTomorrow: 0, ncr: 0 };
                      return (
                        <TableRow key={r.id} hover>
                          {isRange && (
                            <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                              {dayjs(r.reportDate).format("ddd D MMM")}
                            </TableCell>
                          )}
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ContractorBadge code={r.contractorCode} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {r.contractorName}
                                </Typography>
                                {!isRange && (
                                  <Typography variant="caption" color="text.secondary">
                                    {formatThaiDate(r.reportDate)}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{shiftChip(r.morningStatus)}</TableCell>
                          <TableCell>{shiftChip(r.eveningStatus)}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                            {r.totalHeadcount} คน
                          </TableCell>
                          <TableCell align="right">{s.rfiToday}</TableCell>
                          <TableCell align="right">{s.ncr}</TableCell>
                          <TableCell>
                            <StatusChip
                              status={r.reviewStatus === "pending" ? "submitted" : r.reviewStatus}
                              label={statusLabel(r.reviewStatus)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => setReviewTarget(r)}
                              sx={{ textTransform: "none", px: 2 }}
                            >
                              ตรวจสอบ
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                แสดง {rows.length} จาก {queue.length} รายงานทั้งหมด
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Review Dialog with 4 Tabs & Rich Contractor Submitted Data */}
      <ReviewDialog
        report={reviewTarget}
        projectId={projectId}
        onClose={() => setReviewTarget(null)}
      />
    </Box>
  );
}
