import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import dayjs from "dayjs";
import type { ComponentType, ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { SiteConditionsStrip } from "@/components/dashboard/site-conditions-strip.js";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  ManDayByContractorChart,
  addDaysIso,
  contractorColorMap,
  inspectionTypeLabel,
  todayIso,
  useDailyRequests,
  useInspectionRequests,
  useManpowerSummary,
} from "@/features/daily-reports/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { useSafetyFindings, useSafetyStats } from "@/features/safety/index.js";
import { useSiteDay } from "@/features/site-plan/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface ActionItem {
  key: string;
  tone: "error" | "warning";
  title: string;
  detail: string;
  to: string;
}

// PM dashboard: the vital number of every module for the chosen range, each tile a
// quick link to its page (same range), plus one "needs attention" list. All live data.
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : today;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = dayjs(to).diff(dayjs(from), "day") + 1;
  const prevFrom = addDaysIso(from, -span);
  const prevTo = addDaysIso(from, -1);
  const q = `from=${from}&to=${to}`;
  // Submission check is for the last day that has already started.
  const checkDay = to > today ? today : to;

  const { projectId } = useCurrentProject();
  const manpower = useManpowerSummary(projectId, from, to);
  const manpowerPrev = useManpowerSummary(projectId, prevFrom, prevTo);
  const contractors = useProjectContractors(projectId);
  const requests = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });
  const safety = useSafetyStats(projectId, from, to);
  const findings = useSafetyFindings(projectId, addDaysIso(to, -90), to);
  const site = useSiteDay(projectId, from, to);

  const setRange = (f: string, t: string) => setParams({ from: f, to: t }, { replace: true });

  // ---- derive vitals ----
  const mp = manpower.data?.data;
  const mpPrev = manpowerPrev.data?.data;
  const avg = mp?.totals.avgDaily ?? 0;
  const avgPrev = mpPrev?.totals.avgDaily ?? 0;
  const delta = mpPrev && mpPrev.totals.reportedDays ? avg - avgPrev : null;

  const allContractors = contractors.data?.data ?? [];
  const reportedOnLastDay = new Set((mp?.daily ?? []).filter((d) => d.date === checkDay).map((d) => d.contractorCode));
  const missing = allContractors.filter((c) => !reportedOnLastDay.has(c.code));

  const req = requests.data?.data;
  const machineClash = (req?.machinery ?? []).filter((m) => m.conflict === "conflict");
  const roadClash = (req?.roads ?? []).filter((r) => r.conflict);
  const buildings = site.data?.data.buildings ?? [];
  const permits = buildings.flatMap((b) => b.permits);

  const rfiRows = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const rfiWaiting = rfiRows.filter((r) => r.status === "requested" || r.status === "confirmed");
  const rfiNotReady = rfiWaiting.filter((r) => r.readiness !== "ready" || !r.drawingRef);

  const s = safety.data?.data;
  const overdueFindings = (findings.data?.data ?? []).filter((f) => f.status === "open" && f.expectedCompleteDate && f.expectedCompleteDate < today);

  const behind = buildings.flatMap((b) =>
    b.activities
      .filter((a) => a.actualPercent !== null && a.actualPercent < a.planPercent)
      .map((a) => ({ ...a, buildingName: b.name, buildingId: b.id })),
  );
  const behindBuildings = new Set(behind.map((a) => a.buildingId));

  // ---- one attention list for the PM ----
  const actions: ActionItem[] = [
    ...machineClash.map((m) => ({
      key: `m-${m.id}`,
      tone: "error" as const,
      title: `Machine double-booked · ${m.machineType}${m.unitTag ? ` (${m.unitTag})` : ""}`,
      detail: `${m.contractorCode} @ ${m.buildingName} · ${dayjs(m.targetDate).format("D MMM")} ${m.startTime ?? ""}`,
      to: `/today-requests?${q}`,
    })),
    ...roadClash.map((r) => ({
      key: `r-${r.id}`,
      tone: "error" as const,
      title: `Road clash · ${r.roadLocation}`,
      detail: `${r.contractorCode} · ${dayjs(r.targetDate).format("D MMM")} ${r.startTime}–${r.endTime}`,
      to: `/today-requests?${q}`,
    })),
    ...overdueFindings.map((f) => ({
      key: `f-${f.id}`,
      tone: "error" as const,
      title: `Safety finding overdue · item ${f.itemNo}`,
      detail: `${f.contractorCode ?? "-"} · ${f.observation}`,
      to: `/safety`,
    })),
    ...rfiNotReady.map((r) => ({
      key: `q-${r.id}`,
      tone: "warning" as const,
      title: `RFI not ready · ${inspectionTypeLabel(r.inspectionType)}`,
      detail: `${r.contractorCode} · ${r.workItem} · ${dayjs(r.inspectionDate).format("D MMM")} ${r.inspectionTime}${!r.drawingRef ? " · no drawing" : ""}`,
      to: `/qaqc?${q}`,
    })),
    ...behind.slice(0, 6).map((a, i) => ({
      key: `b-${i}`,
      tone: "warning" as const,
      title: `Behind plan · ${a.buildingName}`,
      detail: `${a.contractorCode} · ${a.workDescription} · ${a.actualPercent}% of ${a.planPercent}% plan`,
      to: `/site-plan?${q}&b=${a.buildingId}`,
    })),
    ...(checkDay === today
      ? missing.map((c) => ({
          key: `n-${c.id}`,
          tone: "warning" as const,
          title: `No morning report · ${c.code}`,
          detail: c.name,
          to: `/daily-reports`,
        }))
      : []),
  ];

  const loading = !mp || !req || !rfi.data || !s || !site.data;

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle="Key numbers from every page · click a card to open it with the same dates"
        actions={<DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />}
      />

      <Box sx={{ mb: 2.5 }}>
        <SiteConditionsStrip />
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }, (_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={150} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            <Vital
              to={`/manpower?${q}`}
              icon={EngineeringOutlinedIcon}
              label="Manpower"
              value={avg.toLocaleString()}
              unit={span > 1 ? "people / day (avg)" : "people"}
              trend={delta}
            />
            <Vital
              to={`/daily-reports`}
              icon={DescriptionOutlinedIcon}
              label="Daily Reports"
              value={`${allContractors.length - missing.length}/${allContractors.length}`}
              unit={`submitted · ${dayjs(checkDay).format("D MMM")}`}
              tone={missing.length ? "warning" : "success"}
            />
            <Vital
              to={`/today-requests?${q}`}
              icon={AssignmentOutlinedIcon}
              label="Daily Request"
              value={req.machinery.length + req.equipmentRequests.length + req.roads.length}
              unit={`requests · ${permits.length} PTW`}
              tone={machineClash.length + roadClash.length ? "error" : undefined}
            />
            <Vital
              to={`/qaqc?${q}`}
              icon={FactCheckOutlinedIcon}
              label="QAQC"
              value={rfiWaiting.length}
              unit="RFI waiting"
              tone={rfiNotReady.length ? "warning" : undefined}
            />
            <Vital
              to={`/safety?${q}`}
              icon={HealthAndSafetyOutlinedIcon}
              label="Safety"
              value={s.daysWithoutAccident}
              unit="days without accident"
              tone={s.tiles.accidents ? "error" : overdueFindings.length ? "warning" : "success"}
            />
            <Vital
              to={`/site-plan?${q}`}
              icon={MapOutlinedIcon}
              label="Site Plan"
              value={behindBuildings.size}
              unit="buildings behind plan"
              tone={behind.length ? "warning" : "success"}
            />
          </Grid>

          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Panel title="Needs follow-up" note={actions.length ? `${actions.length} items` : undefined}>
                {actions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                    Nothing open in this range
                  </Typography>
                ) : (
                  <Stack spacing={0.5} sx={{ maxHeight: 360, overflow: "auto" }}>
                    {actions.map((a) => (
                      <Link
                        key={a.key}
                        component={RouterLink}
                        to={a.to}
                        underline="none"
                        color="inherit"
                        sx={{ display: "flex", gap: 1.25, p: 1, borderRadius: 1.5, "&:hover": { bgcolor: "grey.50" } }}
                      >
                        <Box sx={{ width: 8, flexShrink: 0, borderRadius: 1, bgcolor: a.tone === "error" ? "error.main" : "warning.main" }} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {a.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            {a.detail}
                          </Typography>
                        </Box>
                        <ArrowForwardIcon sx={{ fontSize: 16, color: "text.disabled", alignSelf: "center" }} />
                      </Link>
                    ))}
                  </Stack>
                )}
              </Panel>
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Panel
                title="Man-days"
                note={span > 1 ? "Daily headcount by contractor" : "Pick a longer range to see the trend"}
                action={
                  <Link component={RouterLink} to={`/manpower?${q}`} underline="hover" variant="body2">
                    Open Manpower →
                  </Link>
                }
              >
                <ManDayByContractorChart
                  days={Array.from({ length: span }, (_, i) => addDaysIso(from, i))}
                  daily={mp.daily}
                  colors={contractorColorMap(mp.contractors.map((c) => c.contractorCode))}
                />
              </Panel>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

function Vital({
  to,
  icon: Icon,
  label,
  value,
  unit,
  tone,
  trend,
}: {
  to: string;
  icon: ComponentType<SvgIconProps>;
  label: string;
  value: ReactNode;
  unit: string;
  tone?: "success" | "warning" | "error";
  trend?: number | null;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
      <ButtonBase
        component={RouterLink}
        to={to}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          textAlign: "left",
          border: 1,
          borderColor: "divider",
          borderLeft: tone ? 4 : 1,
          borderLeftColor: tone ? `${tone}.main` : "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          p: 2,
          transition: "box-shadow 120ms, border-color 120ms",
          "&:hover": { boxShadow: 2, borderColor: "primary.main" },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Icon sx={{ color: "primary.main", fontSize: 24 }} />
          <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
            {label}
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 18, color: "text.disabled" }} />
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums", color: tone && tone !== "success" ? `${tone}.dark` : "text.primary" }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unit}
          </Typography>
          {trend !== undefined && trend !== null ? (
            <Stack direction="row" alignItems="center" spacing={0.25} sx={{ color: trend >= 0 ? "success.dark" : "error.main", ml: "auto !important" }}>
              {trend >= 0 ? <TrendingUpOutlinedIcon sx={{ fontSize: 16 }} /> : <TrendingDownOutlinedIcon sx={{ fontSize: 16 }} />}
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700 }}>
                {trend >= 0 ? "+" : ""}
                {trend} vs prev.
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </ButtonBase>
    </Grid>
  );
}

function Panel({ title, note, action, children }: { title: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4" component="h2">{title}</Typography>
          {note ? (
            <Typography variant="body2" color="text.secondary">
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
