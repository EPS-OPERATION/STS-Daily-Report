import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ALL_BUILDINGS,
  ALL_CONTRACTORS,
  ContractorBadge,
  ContractorFilterPopover,
  ReviewDialog,
  WorkDoneSummaryTable,
  contractorColorMap,
  countSubmissions,
  filterSubmissions,
  formatThaiDate,
  rfiCountByDay,
  workDoneItemsFromSiteDay,
  todayIso,
  useInspectionRequests,
  useReviewQueue,
  type InspectionRequest,
  type ReviewQueueRow,
  type SubmissionFilter,
  type WorkDoneItem,
} from "@/features/daily-reports/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type PageViewMode = "work-summary" | "history";

// Daily report summary for EPS: work done, and a submission history of who sent what — every
// contractor every day, so missing reports are visible. No approval step (history only).
export function DailyReportsPage() {
  const [params, setParams] = useSearchParams();
  const single = ISO_DATE.test(params.get("date") ?? "") ? params.get("date")! : todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : single;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const isRange = from !== to;

  const [viewMode, setViewMode] = useState<PageViewMode>("work-summary");
  const [search, setSearch] = useState("");
  const [contractor, setContractor] = useState(ALL_CONTRACTORS);
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const [detail, setDetail] = useState<ReviewQueueRow | null>(null);

  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const history = useReviewQueue(projectId, { from, to });
  const inspections = useInspectionRequests(projectId, { from, to, by: "report" });
  const siteDay = useSiteDay(projectId, from, to);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.delete("date");
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const queue: ReviewQueueRow[] = useMemo(() => history.data?.data ?? [], [history.data]);
  const requestList: InspectionRequest[] = useMemo(() => inspections.data?.data ?? [], [inspections.data]);

  // Aggregate work done allocations across all contractors from real DB
  const rawWorkDoneItems: WorkDoneItem[] = useMemo(() => workDoneItemsFromSiteDay(siteDay.data?.data?.buildings ?? []), [siteDay.data]);

  // Contractor lookup and codes
  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) {
      if (c.code) m.set(c.code, c.name);
    }
    for (const q of queue) {
      if (q.contractorCode) m.set(q.contractorCode, q.contractorName || m.get(q.contractorCode) || "");
    }
    for (const item of rawWorkDoneItems) {
      if (item.contractorCode) m.set(item.contractorCode, item.contractorName || m.get(item.contractorCode) || "");
    }
    return m;
  }, [projectContractors, queue, rawWorkDoneItems]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const q of queue) if (q.contractorCode) set.add(q.contractorCode);
    for (const item of rawWorkDoneItems) if (item.contractorCode) set.add(item.contractorCode);
    const codes = set.size > 0 ? [...set] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [queue, rawWorkDoneItems, projectContractors]);

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
    return allCodes.map((code) => {
      const n = queue.filter((q) => q.contractorCode === code && q.hasReport).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? "#999",
        countLabel: `${n} รายงาน`,
      };
    });
  }, [allCodes, queue, contractorNames, colors]);

  // Filtered queue and work done items according to selectedCodes
  const visibleQueue = useMemo(
    () => queue.filter((q) => selectedCodes.has(q.contractorCode)),
    [queue, selectedCodes],
  );
  const workDoneItems = useMemo(
    () => rawWorkDoneItems.filter((item) => selectedCodes.has(item.contractorCode)),
    [rawWorkDoneItems, selectedCodes],
  );

  // RFI raised per contractor per report day.
  const rfiByDay = useMemo(() => rfiCountByDay(requestList), [requestList]);
  const counts = useMemo(() => countSubmissions(visibleQueue), [visibleQueue]);

  // Combined list of contractors for filtering work done
  const workContractorNames = useMemo(() => {
    const set = new Set<string>();
    for (const q of visibleQueue) set.add(q.contractorName);
    for (const item of workDoneItems) set.add(item.contractorName);
    return [...set].sort();
  }, [visibleQueue, workDoneItems]);

  const rows = useMemo(() => filterSubmissions(visibleQueue, { filter, contractor, search }), [visibleQueue, filter, contractor, search]);

  // Summary PDF of exactly what the table shows (opens the print page in a new tab).
  const exportSummaryPdf = () => {
    const p = new URLSearchParams({ from, to, filter });
    if (projectId) p.set("projectId", projectId);
    if (contractor !== ALL_CONTRACTORS) p.set("contractor", contractor);
    if (selectedCodes.size < allCodes.length) p.set("contractors", [...selectedCodes].join(","));
    if (search.trim()) p.set("q", search.trim());
    window.open(`/daily-reports/history/print?${p.toString()}`, "_blank", "noopener");
  };

  const loadError =
    history.error instanceof HttpError
      ? history.error.message
      : inspections.error instanceof HttpError
        ? inspections.error.message
        : null;
  const loading = history.isPending;

  const shiftChip = (s: string) =>
    s === "submitted" ? <StatusChip status="submitted" label="ส่งแล้ว" /> : <StatusChip status="draft" label="ยังไม่ส่ง" />;

  const dateRangeLabel = isRange ? `${formatThaiDate(from)} – ${formatThaiDate(to)}` : formatThaiDate(from);
  const pct = (n: number) => (counts.all > 0 ? `${Math.round((n / counts.all) * 100)}% ของทั้งหมด` : "—");

  return (
    <Box>
      <PageHeader
        title="สรุปรายงานประจำวัน"
        subtitle="สรุปรายงานประจำวันจากผู้รับเหมา — ผลงาน และประวัติการส่ง Daily Report / Daily Request"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />
            {allCodes.length > 0 ? (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            ) : null}
          </Stack>
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
          {/* Submission summary: who sent what in the range */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {[
              { label: "รายการทั้งหมด (ผู้รับเหมา × วัน)", value: `${counts.all} รายการ`, sub: dateRangeLabel, color: "text.primary" },
              { label: "ส่งครบทั้ง 2 รายงาน", value: `${counts.complete} รายการ`, sub: pct(counts.complete), color: "success.dark" },
              { label: "ส่งบางส่วน", value: `${counts.partial} รายการ`, sub: "ส่ง Daily Report หรือ Daily Request อย่างเดียว", color: "warning.dark" },
              { label: "ยังไม่ส่ง", value: `${counts.none} รายการ`, sub: pct(counts.none), color: counts.none > 0 ? "error.dark" : "text.secondary" },
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

          <Box sx={{ mb: 2.5 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{ bgcolor: "background.paper" }}
            >
              <ToggleButton value="work-summary" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, gap: 1 }}>
                <AssignmentOutlinedIcon fontSize="small" />
                สรุปรายการเนื้องาน (Work Done Summary)
              </ToggleButton>
              <ToggleButton value="history" sx={{ textTransform: "none", fontWeight: 700, px: 2.5, py: 1, gap: 1 }}>
                <HistoryOutlinedIcon fontSize="small" />
                ประวัติการส่งรายงาน (Submission History)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {viewMode === "work-summary" ? (
            <WorkDoneSummaryTable
              items={workDoneItems}
              contractors={workContractorNames}
              selectedContractor={contractor}
              onSelectContractor={setContractor}
              dateLabel={dateRangeLabel}
              isRange={isRange}
              onPrint={({ building, search: q }) => {
                const p = new URLSearchParams({ from, to, contractor });
                if (projectId) p.set("projectId", projectId);
                if (building !== ALL_BUILDINGS) p.set("building", building);
                if (q.trim()) p.set("q", q.trim());
                window.open(`/daily-reports/work-done/print?${p.toString()}`, "_blank", "noopener");
              }}
            />
          ) : (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }} role="group" aria-label="กรองตามสถานะการส่ง">
                {(
                  [
                    ["all", `ทั้งหมด (${counts.all})`],
                    ["complete", `ส่งครบ (${counts.complete})`],
                    ["partial", `ส่งบางส่วน (${counts.partial})`],
                    ["none", `ยังไม่ส่ง (${counts.none})`],
                  ] as [SubmissionFilter, string][]
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    clickable
                    color={filter === value ? "primary" : "default"}
                    variant={filter === value ? "filled" : "outlined"}
                    onClick={() => setFilter(value)}
                  />
                ))}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdfOutlinedIcon />}
                  onClick={exportSummaryPdf}
                  disabled={rows.length === 0}
                >
                  Export PDF (สรุปตาราง)
                </Button>
              </Stack>

              <Card variant="outlined">
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id="history-contractor">ผู้รับเหมา</InputLabel>
                      <Select labelId="history-contractor" label="ผู้รับเหมา" value={contractor} onChange={(e) => setContractor(e.target.value)}>
                        <MenuItem value={ALL_CONTRACTORS}>ทุกผู้รับเหมา</MenuItem>
                        {[...new Set(contractorNames.values())].sort().map((c) => (
                          <MenuItem key={c} value={c}>
                            {c}
                          </MenuItem>
                        ))}
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
                      icon={<HistoryOutlinedIcon />}
                      title="ไม่มีรายการที่ตรงกับเงื่อนไข"
                      description="ลองเปลี่ยนช่วงวันที่ ตัวกรอง หรือล้างคำค้นหา"
                      action={
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                            setContractor(ALL_CONTRACTORS);
                          }}
                        >
                          ดูทั้งหมด
                        </Button>
                      }
                    />
                  ) : (
                    <TableContainer>
                      <Table size="small" aria-label="Contractor submission history" sx={{ minWidth: 640 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>วันที่</TableCell>
                            <TableCell>ผู้รับเหมา</TableCell>
                            <TableCell>Daily Report</TableCell>
                            <TableCell>Daily Request</TableCell>
                            <TableCell align="right">คน</TableCell>
                            <TableCell align="right">RFI</TableCell>
                            <TableCell align="right">PDF</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((r) => {
                            const people = r.totalHeadcount || r.eveningHeadcount;
                            const openable = Boolean(r.id);
                            return (
                              <TableRow
                                key={`${r.contractorId}-${r.reportDate}`}
                                hover={openable}
                                onClick={openable ? () => setDetail(r) : undefined}
                                sx={{ cursor: openable ? "pointer" : "default" }}
                              >
                                <TableCell sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                  {dayjs(r.reportDate).format("ddd D MMM")}
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <ContractorBadge code={r.contractorCode} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {r.contractorName}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>{shiftChip(r.morningStatus)}</TableCell>
                                <TableCell>{shiftChip(r.eveningStatus)}</TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                                  {people > 0 ? `${people} คน` : "—"}
                                </TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                                  {rfiByDay.get(`${r.contractorId}|${r.reportDate}`) ?? 0}
                                </TableCell>
                                <TableCell align="right">
                                  {r.id ? (
                                    <IconButton
                                      size="small"
                                      aria-label={`Export PDF ${r.contractorName} ${r.reportDate}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/daily-reports/${r.id}/print`, "_blank", "noopener");
                                      }}
                                    >
                                      <PictureAsPdfOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <Typography variant="body2" color="text.disabled">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
                    แสดง {rows.length} จาก {queue.length} รายการ · คลิกแถวที่ส่งแล้วเพื่อดูรายละเอียด
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      )}

      {/* Read-only report detail (Export PDF available) */}
      <ReviewDialog report={detail} projectId={projectId} onClose={() => setDetail(null)} />
    </Box>
  );
}
