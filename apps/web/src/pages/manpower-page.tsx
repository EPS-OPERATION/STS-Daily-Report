import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  ManDayByContractorChart,
  ManpowerByBuildingChart,
  ManpowerTrendChart,
  NationalityByContractorChart,
  PositionByContractorChart,
  addDaysIso,
  contractorColorMap,
  mondayOf,
  todayIso,
  useManpowerSummary,
  useManpowerTrend,
  usePositionMix,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62; // server limit per query

// Manpower analytics from contractor morning reports (deck p.20/24/25 + v2 notes):
// pick any date range on the calendar; charts by day, building, position, nationality.
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
  const trend = useManpowerTrend(projectId, to, 12);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };
  const thisWeek = () => setRange(mondayOf(today), addDaysIso(mondayOf(today), 6));
  const thisMonth = () => setRange(dayjs(today).startOf("month").format("YYYY-MM-DD"), dayjs(today).endOf("month").format("YYYY-MM-DD"));

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;
  const colors = contractorColorMap([
    ...(data?.contractors.map((c) => c.contractorCode) ?? []),
    ...(positions.data?.data.map((r) => r.contractorCode) ?? []),
  ]);

  return (
    <Box>
      <PageHeader
        title="กำลังคน (Manpower)"
        subtitle="จากรายงานเช้าของผู้รับเหมา · เลือกช่วงวันที่จากปฏิทิน"
        actions={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <DatePicker
              label="ตั้งแต่"
              value={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(v.format("YYYY-MM-DD"), to)}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
            />
            <DatePicker
              label="ถึง"
              value={dayjs(to)}
              minDate={dayjs(from)}
              onChange={(v) => v?.isValid() && setRange(from, v.format("YYYY-MM-DD"))}
              format="D MMM YYYY"
              slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
            />
            <Button size="small" variant="outlined" onClick={thisWeek}>
              สัปดาห์นี้
            </Button>
            <Button size="small" variant="outlined" onClick={thisMonth}>
              เดือนนี้
            </Button>
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

      {tooLong ? null : !data ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={340} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {summary.isFetching ? <LinearProgress sx={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 10 }} /> : null}

          <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={3} rowGap={0.5}>
            <Figure label="Man-days" value={data.totals.manDays.toLocaleString()} />
            <Figure label="NMH (ชม.)" value={data.totals.manHours.toLocaleString()} />
            <Figure label="เฉลี่ยคน/วัน" value={data.totals.avgDaily.toLocaleString()} />
            <Figure label="ผู้รับเหมาที่รายงาน" value={data.contractors.length} />
          </Stack>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <ChartPanel title="Man-day รายวัน แยกตามผู้รับเหมา" note="จำนวนคนเข้างานต่อวัน (รายงานเช้า)">
                <ManDayByContractorChart days={days} daily={data.daily} colors={colors} />
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <ChartPanel title="แนวโน้มกำลังคน 12 สัปดาห์" note="เฉลี่ยคน/วัน ต่อสัปดาห์">
                {trend.data ? (
                  <ManpowerTrendChart points={trend.data.data} currentWeek={mondayOf(to)} />
                ) : (
                  <Skeleton variant="rounded" height={300} />
                )}
              </ChartPanel>
            </Grid>

            <Grid size={12}>
              <ChartPanel title="กำลังคนแยกตามอาคาร" note="คน-วัน รวมในช่วงที่เลือก แยกสีตามผู้รับเหมา">
                <ManpowerByBuildingChart rows={data.byBuilding} colors={colors} />
              </ChartPanel>
            </Grid>

            <Grid size={{ xs: 12, lg: 7 }}>
              <ChartPanel title="จำนวนคนตามตำแหน่ง แยกตามผู้รับเหมา" note="เฉลี่ยคน/วัน ในวันที่ผู้รับเหมารายงาน">
                {positions.data ? (
                  <PositionByContractorChart rows={positions.data.data} colors={colors} />
                ) : (
                  <Skeleton variant="rounded" height={320} />
                )}
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <ChartPanel title="สัญชาติ / เพศ แยกตามผู้รับเหมา" note="คน-วัน รวมในช่วงที่เลือก">
                <NationalityByContractorChart contractors={data.contractors} />
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
