import { useMemo, type ReactNode } from "react";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import { useContractors } from "@/features/contractors/index.js";
import {
  ContractorFilterPopover,
  ManDayByContractorChart,
  ManpowerByBuildingChart,
  ManpowerTrendChart,
  NationalityByContractorChart,
  PositionByContractorChart,
  TREND_DAILY_MAX_DAYS,
  addDaysIso,
  contractorColorMap,
  mondayOf,
  todayIso,
  useManpowerSummary,
  usePositionMix,
  type ContractorFilterItem,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62; // server limit per query

// Manpower analytics from contractor morning reports (deck p.20/24/25 + v2 notes):
// pick any date range on the calendar; charts by day, building, position, nationality;
// with Excel-style checkbox filter for contractors.
export function ManpowerPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const defaultFrom = mondayOf(today);
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : defaultFrom;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : addDaysIso(defaultFrom, 6);
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = dayjs(to).diff(dayjs(from), "day") + 1;
  const tooLong = span > MAX_DAYS;
  const days = tooLong ? [] : Array.from({ length: span }, (_, i) => addDaysIso(from, i));

  const { projectId } = useCurrentProject();
  const queryProject = tooLong ? null : projectId;
  const summary = useManpowerSummary(queryProject, from, to);
  const positions = usePositionMix(queryProject, from, to);
  const contractorsList = useContractors({ page: 1, pageSize: 100 });

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };
  const thisWeek = () => setRange(mondayOf(today), addDaysIso(mondayOf(today), 6));
  const thisMonth = () =>
    setRange(dayjs(today).startOf("month").format("YYYY-MM-DD"), dayjs(today).endOf("month").format("YYYY-MM-DD"));

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;

  // Contractor code to name mapping
  const contractorNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contractorsList.data?.data ?? []) {
      map.set(c.code, c.name);
    }
    return map;
  }, [contractorsList.data?.data]);

  // All distinct contractor codes in current data scope
  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const c of data?.contractors ?? []) set.add(c.contractorCode);
    for (const r of positions.data?.data ?? []) set.add(r.contractorCode);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data?.contractors, positions.data?.data]);

  const colors = useMemo(() => contractorColorMap(allCodes), [allCodes]);

  // Read selected contractors from URL query or default to all
  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    if (!raw.trim()) return new Set<string>();
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allCodes.includes(s));
    return new Set(list);
  }, [params, allCodes]);

  const updateContractorSelection = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length || next.size === 0) {
      p.delete("contractors");
    } else {
      p.set("contractors", Array.from(next).sort().join(","));
    }
    setParams(p, { replace: true });
  };

  const removeContractor = (code: string) => {
    const next = new Set(selectedCodes);
    next.delete(code);
    updateContractorSelection(next);
  };

  const selectAllContractors = () => {
    updateContractorSelection(new Set(allCodes));
  };

  // Filter items for the Excel-like popover
  const filterItems = useMemo<ContractorFilterItem[]>(() => {
    return allCodes.map((code) => {
      const row = data?.contractors.find((c) => c.contractorCode === code);
      return {
        code,
        name: contractorNameMap.get(code),
        manDays: row?.manDays,
        color: colors.get(code) ?? "#666",
      };
    });
  }, [allCodes, contractorNameMap, data?.contractors, colors]);

  const isFiltered = selectedCodes.size > 0 && selectedCodes.size < allCodes.length;
  const isNoneSelected = allCodes.length > 0 && selectedCodes.size === 0;

  // Filtered data slices according to selected contractors
  const filteredContractors = useMemo(() => {
    if (!data?.contractors) return [];
    return data.contractors.filter((c) => selectedCodes.has(c.contractorCode));
  }, [data?.contractors, selectedCodes]);

  const filteredDaily = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.filter((d) => selectedCodes.has(d.contractorCode));
  }, [data?.daily, selectedCodes]);

  const filteredByBuilding = useMemo(() => {
    if (!data?.byBuilding) return [];
    return data.byBuilding.map((b) => ({
      ...b,
      contractors: Object.fromEntries(
        Object.entries(b.contractors).filter(([code]) => selectedCodes.has(code)),
      ),
    }));
  }, [data?.byBuilding, selectedCodes]);

  const filteredPositions = useMemo(() => {
    if (!positions.data?.data) return [];
    return positions.data.data.filter((r) => selectedCodes.has(r.contractorCode));
  }, [positions.data?.data, selectedCodes]);

  // Dynamic KPI totals for filtered contractors
  const totals = useMemo(() => {
    if (!data) return { manDays: 0, manHours: 0, avgDaily: 0, count: 0 };
    if (!isFiltered && selectedCodes.size === allCodes.length) {
      return {
        manDays: data.totals.manDays,
        manHours: data.totals.manHours,
        avgDaily: data.totals.avgDaily,
        count: data.contractors.length,
      };
    }
    const manDays = filteredContractors.reduce((sum, c) => sum + c.manDays, 0);
    const manHours = filteredContractors.reduce((sum, c) => sum + c.manHours, 0);
    const byDay = new Map<string, number>();
    for (const d of filteredDaily) {
      byDay.set(d.date, (byDay.get(d.date) ?? 0) + d.headcount);
    }
    const reportedDays = [...byDay.values()].filter((v) => v > 0).length;
    const avgDaily = reportedDays ? Math.round(manDays / reportedDays) : 0;
    return { manDays, manHours, avgDaily, count: filteredContractors.length };
  }, [data, isFiltered, selectedCodes.size, allCodes.length, filteredContractors, filteredDaily]);

  return (
    <Box>
      <PageHeader
        title="กำลังคน (Manpower)"
        subtitle="จากรายงานเช้าของผู้รับเหมา · เลือกช่วงวันที่และกรองผู้รับเหมาตามต้องการ"
        actions={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <DatePicker
              label="ตั้งแต่"
              value={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(v.format("YYYY-MM-DD"), to)}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 155 } } }}
            />
            <DatePicker
              label="ถึง"
              value={dayjs(to)}
              minDate={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(from, v.format("YYYY-MM-DD"))}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 155 } } }}
            />
            <Button size="small" variant="outlined" onClick={thisWeek}>
              สัปดาห์นี้
            </Button>
            <Button size="small" variant="outlined" onClick={thisMonth}>
              เดือนนี้
            </Button>
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={updateContractorSelection}
              />
            )}
          </Stack>
        }
      />

      {tooLong ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          เลือกได้ไม่เกิน {MAX_DAYS} วันต่อครั้ง (ตอนนี้ {span} วัน) — ปรับวันที่ให้สั้นลง
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </Alert>
      ) : null}

      {/* Active Filter Bar (shown when filtering is applied) */}
      {isFiltered && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.25,
            px: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            bgcolor: "action.hover",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <FilterAltOutlinedIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              กรองเฉพาะผู้รับเหมา ({selectedCodes.size}/{allCodes.length} เจ้า):
            </Typography>
            {Array.from(selectedCodes).map((code) => (
              <Chip
                key={code}
                size="small"
                label={contractorNameMap.get(code) ? `${code} (${contractorNameMap.get(code)})` : code}
                onDelete={() => removeContractor(code)}
                sx={{
                  bgcolor: colors.get(code),
                  color: "common.white",
                  fontWeight: 700,
                  "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.8)", "&:hover": { color: "common.white" } },
                }}
              />
            ))}
          </Stack>
          <Button size="small" variant="text" onClick={selectAllContractors} sx={{ fontWeight: 600 }}>
            แสดงทั้งหมด ({allCodes.length})
          </Button>
        </Paper>
      )}

      {/* Empty Selection State */}
      {isNoneSelected && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={selectAllContractors}>
              เลือกทั้งหมด
            </Button>
          }
          sx={{ mb: 2 }}
        >
          คุณไม่ได้เลือกผู้รับเหมาใดๆ — กรุณาเลือกผู้รับเหมาอย่างน้อย 1 เจ้าเพื่อดูการวิเคราะห์กำลังคน
        </Alert>
      )}

      {tooLong ? null : !data ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={340} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {summary.isFetching ? <LinearProgress sx={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 10 }} /> : null}

          <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={3} rowGap={0.5}>
            <Figure label="Man-days" value={totals.manDays.toLocaleString()} />
            <Figure label="NMH (ชม.)" value={totals.manHours.toLocaleString()} />
            <Figure label="เฉลี่ยคน/วัน" value={totals.avgDaily.toLocaleString()} />
            <Figure
              label="ผู้รับเหมาที่วิเคราะห์"
              value={isFiltered ? `${totals.count}/${allCodes.length}` : totals.count}
            />
          </Stack>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <ChartPanel
                title="Man-day รายวัน แยกตามผู้รับเหมา"
                note={
                  isFiltered
                    ? `จำนวนคนเข้างานต่อวัน (กรองเฉพาะ ${selectedCodes.size} เจ้าที่เลือก)`
                    : "จำนวนคนเข้างานต่อวัน (รายงานเช้า)"
                }
              >
                <ManDayByContractorChart days={days} daily={filteredDaily} colors={colors} />
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <ChartPanel
                title="แนวโน้มกำลังคน"
                note={
                  span > TREND_DAILY_MAX_DAYS
                    ? "เฉลี่ยคน/วัน รายสัปดาห์ ในช่วงที่เลือก"
                    : "คนเข้างานรายวัน ในช่วงที่เลือก"
                }
              >
                <ManpowerTrendChart days={days} daily={filteredDaily} />
              </ChartPanel>
            </Grid>

            <Grid size={12}>
              <ChartPanel
                title="กำลังคนแยกตามอาคาร"
                note={
                  isFiltered
                    ? `คน-วัน รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา (${selectedCodes.size} เจ้า)`
                    : "คน-วัน รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา"
                }
              >
                <ManpowerByBuildingChart rows={filteredByBuilding} colors={colors} />
              </ChartPanel>
            </Grid>

            <Grid size={{ xs: 12, lg: 7 }}>
              <ChartPanel
                title="จำนวนคนตามตำแหน่ง แยกตามผู้รับเหมา"
                note={
                  isFiltered
                    ? `จำนวนคนรวมตามตำแหน่ง ในช่วงที่เลือก (${selectedCodes.size} เจ้า)`
                    : "จำนวนคนรวมตามตำแหน่ง ในช่วงที่เลือก"
                }
              >
                {positions.data ? (
                  <PositionByContractorChart rows={filteredPositions} colors={colors} />
                ) : (
                  <Skeleton variant="rounded" height={320} />
                )}
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <ChartPanel
                title="สัญชาติ / เพศ แยกตามผู้รับเหมา"
                note={
                  isFiltered
                    ? `คน-วัน รวมในช่วงที่เลือก (${selectedCodes.size} เจ้า)`
                    : "คน-วัน รวมในช่วงที่เลือก"
                }
              >
                <NationalityByContractorChart contractors={filteredContractors} />
              </ChartPanel>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}

function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function ChartPanel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Typography variant="h5">{title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
}
