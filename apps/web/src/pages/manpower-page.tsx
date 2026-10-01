import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  ContractorTotalsChart,
  ManDayByContractorChart,
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
type Period = "week" | "month";

function rangeOf(period: Period, at: string) {
  if (period === "week") {
    const from = mondayOf(at);
    return { from, to: addDaysIso(from, 6) };
  }
  const d = dayjs(at);
  return { from: d.startOf("month").format("YYYY-MM-DD"), to: d.endOf("month").format("YYYY-MM-DD") };
}

// Manpower analytics from contractor morning reports (deck p.20/24/25):
// daily man-days, trend, positions, nationality/sex, man-days & NMH by contractor.
export function ManpowerPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const period: Period = params.get("period") === "month" ? "month" : "week";
  const at = ISO_DATE.test(params.get("at") ?? "") ? params.get("at")! : today;
  const { from, to } = rangeOf(period, at);
  const days = Array.from({ length: dayjs(to).diff(dayjs(from), "day") + 1 }, (_, i) => addDaysIso(from, i));
  const { projectId } = useCurrentProject();
  const summary = useManpowerSummary(projectId, from, to);
  const positions = usePositionMix(projectId, from, to);
  const trend = useManpowerTrend(projectId, to, 12);

  const setQuery = (next: { period?: Period; at?: string }) => {
    const p = new URLSearchParams(params);
    if (next.period) p.set("period", next.period);
    if (next.at) p.set("at", next.at);
    setParams(p, { replace: true });
  };
  const step = (dir: -1 | 1) =>
    setQuery({ at: period === "week" ? addDaysIso(from, dir * 7) : dayjs(from).add(dir, "month").format("YYYY-MM-DD") });

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;
  const colors = contractorColorMap([
    ...(data?.contractors.map((c) => c.contractorCode) ?? []),
    ...(positions.data?.data.map((r) => r.contractorCode) ?? []),
  ]);
  const isCurrent = today >= from && today <= to;
  const label =
    period === "week" ? `${dayjs(from).format("D MMM")} – ${dayjs(to).format("D MMM YYYY")}` : dayjs(from).format("MMMM YYYY");

  return (
    <Box>
      <PageHeader
        title="กำลังคน (Manpower)"
        subtitle="จากรายงานเช้าของผู้รับเหมา · Man-day, NMH, ตำแหน่ง, สัญชาติ/เพศ"
        actions={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={period}
              onChange={(_, v: Period | null) => v && setQuery({ period: v, at: from })}
            >
              <ToggleButton value="week">รายสัปดาห์</ToggleButton>
              <ToggleButton value="month">รายเดือน</ToggleButton>
            </ToggleButtonGroup>
            <IconButton aria-label="ช่วงก่อนหน้า" onClick={() => step(-1)}>
              <ChevronLeftOutlinedIcon />
            </IconButton>
            <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 160, textAlign: "center" }}>
              {label}
            </Typography>
            <IconButton aria-label="ช่วงถัดไป" onClick={() => step(1)}>
              <ChevronRightOutlinedIcon />
            </IconButton>
            <Button variant="outlined" size="small" disabled={isCurrent} onClick={() => setQuery({ at: today })}>
              ปัจจุบัน
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          โหลดข้อมูลไม่สำเร็จ: {error.message}
        </Alert>
      ) : null}

      {!data ? (
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
              <ChartPanel title="จำนวนคนตามตำแหน่ง แยกตามผู้รับเหมา" note="เฉลี่ยคน/วัน ในวันที่ผู้รับเหมารายงาน">
                {positions.data ? (
                  <PositionByContractorChart rows={positions.data.data} colors={colors} />
                ) : (
                  <Skeleton variant="rounded" height={320} />
                )}
              </ChartPanel>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <ChartPanel title="สัญชาติ / เพศ แยกตามผู้รับเหมา" note="คน-วัน รวมในช่วงที่เลือก">
                <NationalityByContractorChart contractors={data.contractors} />
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <ChartPanel title="Man-days ต่อผู้รับเหมา" note="คน-วัน รวม">
                <ContractorTotalsChart contractors={data.contractors} measure="manDays" colors={colors} />
              </ChartPanel>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <ChartPanel title="NMH ต่อผู้รับเหมา" note="คน × (ชม.ปกติ + OT)">
                <ContractorTotalsChart contractors={data.contractors} measure="manHours" colors={colors} />
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
