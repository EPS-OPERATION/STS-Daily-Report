import { useEffect, useMemo, useState } from "react";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PieChart } from "@mui/x-charts/PieChart";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CHART_SERIES } from "@/app/theme/chart-palette.js";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { EmptySection } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { ContractorBadge, contractorColorMap } from "@/features/contractors/index.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { addDaysIso, formatThaiDate, todayIso } from "@/lib/dates.js";
import { inspectionTypeLabel } from "../components/request-section.js";
import { useInspectionRequests } from "../hooks/use-inspection-requests.js";
import { type InspectionRequest } from "../types/inspection-request.types.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

type Share = { code: string; name: string; count: number; color: string };

/**
 * QAQC — RFI (Request For Inspection).
 * Today/tomorrow inspection schedule for site coordination (read-only, no approval step),
 * plus a date-range breakdown by contractor and building and the RFI history, where EPS
 * confirms requests and records results: pass / not pass (correct) → first-pass yield.
 */
export function QaqcBoardPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);

  const rawFrom = ISO_DATE.test(params.get("from") ?? "")
    ? params.get("from")!
    : dayjs(today).startOf("month").format("YYYY-MM-DD");
  const rawTo = ISO_DATE.test(params.get("to") ?? "")
    ? params.get("to")!
    : dayjs(today).endOf("month").format("YYYY-MM-DD");
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const tooLong = dayjs(to).diff(dayjs(from), "day") + 1 > MAX_DAYS;

  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const scheduleQuery = useInspectionRequests(projectId, { from: today, to: tomorrow, by: "inspection" });
  const historyQuery = useInspectionRequests(tooLong ? null : projectId, { from, to, by: "inspection" });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const scheduleRows = scheduleQuery.data?.data ?? [];
  const historyRows = historyQuery.data?.data ?? [];

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) {
      if (c.code) m.set(c.code, c.name);
    }
    for (const r of [...scheduleRows, ...historyRows]) {
      if (r.contractorCode) m.set(r.contractorCode, r.contractorName || m.get(r.contractorCode) || "");
    }
    return m;
  }, [projectContractors, scheduleRows, historyRows]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of [...scheduleRows, ...historyRows]) {
      if (r.contractorCode) set.add(r.contractorCode);
    }
    const codes = set.size > 0 ? [...set] : projectContractors.map((c) => c.code);
    return codes.sort((a, b) => a.localeCompare(b));
  }, [scheduleRows, historyRows, projectContractors]);

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
      const n = [...scheduleRows, ...historyRows].filter((r) => r.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? CHART_SERIES[0]!,
        countLabel: `${n} คำขอ`,
      };
    });
  }, [allCodes, scheduleRows, historyRows, contractorNames, colors]);

  const visibleScheduleRows = useMemo(
    () => scheduleRows.filter((r) => selectedCodes.has(r.contractorCode)),
    [scheduleRows, selectedCodes],
  );
  const byTime = (a: InspectionRequest, b: InspectionRequest) => a.inspectionTime.localeCompare(b.inspectionTime);
  const todayRequests = useMemo(
    () => visibleScheduleRows.filter((r) => r.inspectionDate === today).sort(byTime),
    [visibleScheduleRows, today],
  );
  const tomorrowRequests = useMemo(
    () => visibleScheduleRows.filter((r) => r.inspectionDate === tomorrow).sort(byTime),
    [visibleScheduleRows, tomorrow],
  );

  const visibleHistoryRows = useMemo(
    () => historyRows.filter((r) => selectedCodes.has(r.contractorCode)),
    [historyRows, selectedCodes],
  );

  const contractorShares = useMemo<Share[]>(() => {
    const list = tally(visibleHistoryRows, (r) => r.contractorCode || "—", (r) => r.contractorName || r.contractorCode);
    const cColors = contractorColorMap(list.map((c) => c.code));
    return list.map((c) => ({ ...c, color: cColors.get(c.code) ?? CHART_SERIES[0]! }));
  }, [visibleHistoryRows]);

  const buildingShares = useMemo<Share[]>(
    () =>
      tally(visibleHistoryRows, (r) => r.buildingCode || "—", (r) => r.buildingName || "ไม่ระบุอาคาร").map((b, i) => ({
        ...b,
        color: CHART_SERIES[i % CHART_SERIES.length]!,
      })),
    [visibleHistoryRows],
  );

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return visibleHistoryRows;
    return visibleHistoryRows.filter((r) =>
      [r.contractorCode, r.contractorName, r.buildingCode, r.buildingName, r.workItem, r.drawingRef, inspectionTypeLabel(r.inspectionType)]
        .some((v) => v?.toLowerCase().includes(q)),
    );
  }, [visibleHistoryRows, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, from, to, selectedCodes]);

  const rangeLabel = from === to ? formatThaiDate(from) : `${formatThaiDate(from)} – ${formatThaiDate(to)}`;

  return (
    <Box sx={{ pb: 6 }}>
      <PageHeader
        title="QAQC — RFI"
        subtitle="คำขอตรวจงาน (Request For Inspection) ที่ผู้รับเหมาส่งมาพร้อมรายงานช่วงบ่าย"
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <DateRangeFields from={from} to={to} maxDays={MAX_DAYS} onChange={setRange} />
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

      {tooLong && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          เลือกช่วงวันที่ได้ไม่เกิน {MAX_DAYS} วันต่อครั้ง
        </Alert>
      )}

      {/* Inspection schedule: today + tomorrow, always current regardless of the selected range */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <Grid container>
          <Grid size={{ xs: 12, md: 6 }} sx={{ borderRight: { md: 1 }, borderColor: { md: "divider" } }}>
            <ScheduleColumn
              title="นัดตรวจวันนี้"
              date={today}
              rows={todayRequests}
              loading={scheduleQuery.isLoading}
              empty="ไม่มีนัดตรวจวันนี้"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ borderTop: { xs: 1, md: 0 }, borderColor: { xs: "divider", md: "divider" } }}>
            <ScheduleColumn
              title="นัดตรวจพรุ่งนี้"
              date={tomorrow}
              rows={tomorrowRequests}
              loading={scheduleQuery.isLoading}
              empty="ยังไม่มีคำขอสำหรับพรุ่งนี้"
            />
          </Grid>
        </Grid>
      </Card>

      {/* Breakdown for the selected range */}
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          สรุปคำขอตรวจ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {rangeLabel} · {historyRows.length} รายการ
        </Typography>
      </Stack>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ShareCard
            title="ตามผู้รับเหมา"
            centerLabel="คำขอ"
            shares={contractorShares}
            total={historyRows.length}
            loading={historyQuery.isLoading}
            renderLabel={(s) => <ContractorBadge code={s.code} title={s.name} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ShareCard
            title="ตามอาคาร"
            centerLabel="คำขอ"
            shares={buildingShares}
            total={historyRows.length}
            loading={historyQuery.isLoading}
            renderLabel={(s) => (
              <Typography variant="body2" noWrap>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {s.code}
                </Box>{" "}
                {s.name !== s.code && (
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    {s.name}
                  </Box>
                )}
              </Typography>
            )}
          />
        </Grid>
      </Grid>

      {/* RFI log */}
      <Card variant="outlined">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1.5}
          sx={{ px: 2.5, py: 2 }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ประวัติคำขอตรวจ
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rangeLabel} · {filteredHistory.length} รายการ
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="ค้นหาผู้รับเหมา อาคาร งาน หรือแบบ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: "100%", sm: 300 } }}
          />
        </Stack>
        <Divider />
        {historyQuery.isLoading ? (
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" height={160} />
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptySection
              icon={searchQuery ? <SearchOffOutlinedIcon /> : <FactCheckOutlinedIcon />}
              title={searchQuery ? "ไม่พบรายการที่ตรงกับคำค้นหา" : "ไม่มีคำขอตรวจในช่วงวันที่เลือก"}
              description={searchQuery ? "ลองแก้คำค้นหาหรือล้างตัวกรอง" : "คำขอจะขึ้นที่นี่เมื่อผู้รับเหมาส่งพร้อมรายงานบ่าย"}
            />
          </Box>
        ) : (
          <>
            <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 130 }}>วันตรวจ</TableCell>
                  <TableCell sx={{ width: 90 }}>เวลา</TableCell>
                  <TableCell sx={{ width: 120 }}>ผู้รับเหมา</TableCell>
                  <TableCell sx={{ width: 220 }}>อาคาร / ตำแหน่ง</TableCell>
                  <TableCell>รายการตรวจ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatThaiDate(r.inspectionDate)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.inspectionTime}</TableCell>
                    <TableCell>
                      <ContractorBadge code={r.contractorCode} title={r.contractorName} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.buildingCode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {[r.buildingName !== r.buildingCode ? r.buildingName : null, r.location].filter(Boolean).join(" · ")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {r.workItem}
                      </Typography>
                      {r.inspectionType && r.inspectionType !== "other" ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {inspectionTypeLabel(r.inspectionType)}
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredHistory.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="แถวต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count}`}
            sx={{ borderTop: 1, borderColor: "divider" }}
          />
        </>
        )}
      </Card>
    </Box>
  );
}

function tally(
  rows: InspectionRequest[],
  key: (r: InspectionRequest) => string,
  name: (r: InspectionRequest) => string,
): Array<{ code: string; name: string; count: number }> {
  const map = new Map<string, { code: string; name: string; count: number }>();
  for (const r of rows) {
    const code = key(r);
    const entry = map.get(code) ?? { code, name: name(r), count: 0 };
    entry.count += 1;
    map.set(code, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** One day of the inspection schedule as a time-ordered list. */
function ScheduleColumn({
  title,
  date,
  rows,
  loading,
  empty,
}: {
  title: string;
  date: string;
  rows: InspectionRequest[];
  loading: boolean;
  empty: string;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}{" "}
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            ({rows.length})
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatThaiDate(date)}
        </Typography>
      </Stack>
      <Divider />
      {loading ? (
        <Stack spacing={1} sx={{ p: 2.5 }}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <EmptySection dense icon={<EventAvailableOutlinedIcon />} title={empty} />
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {rows.map((r) => (
            <Stack key={r.id} direction="row" spacing={2} alignItems="flex-start" sx={{ px: 2.5, py: 1.5 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", width: 44, flexShrink: 0, pt: 0.25 }}
              >
                {r.inspectionTime}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                  <ContractorBadge code={r.contractorCode} title={r.contractorName} />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {r.inspectionType && r.inspectionType !== "other"
                      ? `${inspectionTypeLabel(r.inspectionType)} · ${r.workItem}`
                      : r.workItem}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {[`${r.buildingCode}${r.location ? ` · ${r.location}` : ""}`, r.drawingRef]
                    .filter(Boolean)
                    .join(" — ")}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

/** Donut of the share with a legend listing count and percent per slice. */
function ShareCard({
  title,
  centerLabel,
  shares,
  total,
  loading,
  renderLabel,
}: {
  title: string;
  centerLabel: string;
  shares: Share[];
  total: number;
  loading: boolean;
  renderLabel: (s: Share) => ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 2.5, pt: 2, pb: 1.5 }}>
        {title}
      </Typography>
      <Divider />
      {loading ? (
        <Box sx={{ p: 2.5 }}>
          <Skeleton variant="rounded" height={200} />
        </Box>
      ) : shares.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <EmptySection icon={<DonutLargeOutlinedIcon />} title="ไม่มีคำขอตรวจในช่วงวันที่เลือก" description="เลือกช่วงวันที่อื่น หรือรอผู้รับเหมาส่งคำขอ" />
        </Box>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center" sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
            <PieChart
              series={[
                {
                  data: shares.map((s, i) => ({ id: i, value: s.count, label: s.code, color: s.color })),
                  innerRadius: 62,
                  outerRadius: 92,
                  paddingAngle: 1.5,
                  cornerRadius: 3,
                },
              ]}
              width={200}
              height={200}
              hideLegend
              margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {centerLabel}
              </Typography>
            </Box>
          </Box>
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: "100%", maxHeight: 200, overflowY: "auto" }}>
            {shares.map((s) => (
              <Stack key={s.code} direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: s.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>{renderLabel(s)}</Box>
                <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {s.count}
                  </Box>{" "}
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    · {total > 0 ? Math.round((s.count / total) * 100) : 0}%
                  </Box>
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </Card>
  );
}
