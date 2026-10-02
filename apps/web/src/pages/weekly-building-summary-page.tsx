import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  BuildingActivityMatrix,
  MachineryAllocationTable,
  ManDayByContractorChart,
  RoadUsageTable,
  WorkloadLegend,
  addDaysIso,
  contractorColorMap,
  mondayOf,
  todayIso,
  useManpowerSummary,
  useWeeklySummary,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
type DetailTab = "matrix" | "machinery" | "roads";

// Weekly coordination meeting (desktop-first). Charts first, as in the requirements
// deck; the detailed building × day matrix and booking tables sit in tabs below.
export function WeeklyBuildingSummaryPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const weekStart = mondayOf(ISO_DATE.test(params.get("week") ?? "") ? params.get("week")! : today);
  const weekEnd = addDaysIso(weekStart, 6);
  const { projectId } = useCurrentProject();
  const summary = useWeeklySummary(projectId, weekStart);
  const manpower = useManpowerSummary(projectId, weekStart, weekEnd);
  const [tab, setTab] = useState<DetailTab>("matrix");

  const goWeek = (delta: number) => {
    const p = new URLSearchParams(params);
    p.set("week", addDaysIso(weekStart, delta * 7));
    setParams(p, { replace: true });
  };

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;
  // One colour per contractor across all charts on the page.
  const colors = contractorColorMap(manpower.data?.data.contractors.map((c) => c.contractorCode) ?? []);
  const qaqc = data ? data.requests.requested + data.requests.confirmed + data.requests.inspected + data.requests.closed : 0;

  return (
    <Box>
      <PageHeader
        title="สรุปประชุมประจำสัปดาห์"
        subtitle="Weekly coordination · กำลังคนรายวัน และการใช้อาคาร/เครื่องจักร/ถนน (กราฟกำลังคนเต็มที่หน้า Manpower)"
        actions={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton aria-label="สัปดาห์ก่อน" onClick={() => goWeek(-1)}>
              <ChevronLeftOutlinedIcon />
            </IconButton>
            <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 170, textAlign: "center" }}>
              {dayjs(weekStart).format("D MMM")} – {dayjs(weekEnd).format("D MMM YYYY")}
            </Typography>
            <IconButton aria-label="สัปดาห์ถัดไป" onClick={() => goWeek(1)}>
              <ChevronRightOutlinedIcon />
            </IconButton>
            <Button variant="outlined" size="small" onClick={() => setParams({}, { replace: true })} disabled={weekStart === mondayOf(today)}>
              สัปดาห์นี้
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

          {/* One quiet line of totals instead of KPI cards. */}
          <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={3} rowGap={0.5}>
            <Figure label="Man-days" value={data.totals.manDays.toLocaleString()} />
            <Figure label="NMH (ชม.)" value={data.totals.manHours.toLocaleString()} />
            <Figure label="เครื่องจักรที่ขอ" value={data.totals.bookings} />
            <Figure label="ขอใช้ถนน" value={data.roads.length} />
            <Figure
              label="คำขอตรวจ QAQC"
              value={
                <Link component={RouterLink} to="/qaqc" underline="hover">
                  {qaqc}
                </Link>
              }
            />
          </Stack>

          {/* Full manpower analytics live on /manpower; the meeting page keeps one chart. */}
          <ChartPanel
            title="Man-day รายวัน แยกตามผู้รับเหมา"
            note="จำนวนคนเข้างานต่อวัน (รายงานเช้า)"
            action={
              <Link component={RouterLink} to={`/manpower?period=week&at=${weekStart}`} underline="hover" variant="body2">
                ดูกำลังคนทั้งหมด →
              </Link>
            }
          >
            {manpower.data ? (
              <ManDayByContractorChart days={data.days} daily={manpower.data.data.daily} colors={colors} />
            ) : (
              <Skeleton variant="rounded" height={300} />
            )}
          </ChartPanel>

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ md: "center" }}
              sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tabs value={tab} onChange={(_, v: DetailTab) => setTab(v)}>
                <Tab value="matrix" label="อาคาร × วัน" />
                <Tab value="machinery" label={`เครื่องจักร (${data.totals.bookings})`} />
                <Tab value="roads" label={`ถนน (${data.roads.length})`} />
              </Tabs>
            </Stack>
            <Box sx={{ p: 2 }}>
              {tab === "matrix" ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <WorkloadLegend />
                  </Box>
                  <BuildingActivityMatrix days={data.days} rows={data.buildings} today={today} hideEmpty />
                </>
              ) : tab === "machinery" ? (
                <MachineryAllocationTable bookings={data.machinery} onlyConflicts={false} />
              ) : (
                <RoadUsageTable roads={data.roads} />
              )}
            </Box>
          </Box>
        </Stack>
      )}
    </Box>
  );
}

function Figure({ label, value, alert }: { label: string; value: ReactNode; alert?: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="h5"
        component="span"
        sx={{ fontVariantNumeric: "tabular-nums", color: alert ? "error.main" : "text.primary" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function ChartPanel({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
        <Typography variant="h5">{title}</Typography>
        {action}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
      <Box sx={{ mt: 1 }}>{children}</Box>
    </Box>
  );
}
