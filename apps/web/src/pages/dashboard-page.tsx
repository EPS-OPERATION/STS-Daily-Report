import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { navigationIcons, type NavigationIconKey } from "@/app/icons/navigation-icons.js";
import { SiteConditionsStrip } from "@/components/dashboard/site-conditions-strip.js";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import {
  ManDaySmallMultiples,
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

type Health = "ok" | "check" | "issue";
const HEALTH_CHIP: Record<Health, { status: string; label: string }> = {
  ok: { status: "active", label: "On track" },
  check: { status: "attention", label: "Check" },
  issue: { status: "blocked", label: "Issue" },
};

interface ModuleRow {
  page: string; // = sidebar page name
  icon: NavigationIconKey;
  to: string;
  value: ReactNode;
  unit: string;
  facts: string[];
  health: Health;
  trend?: number | null;
}

interface ActionItem {
  key: string;
  severity: "issue" | "check";
  page: string;
  title: string;
  detail: string;
  to: string;
}

// PM dashboard: one status board with the vital number of every module (row = page,
// click = open that page with the same range), what needs follow-up, and man-days.
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : today;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = dayjs(to).diff(dayjs(from), "day") + 1;
  const q = `from=${from}&to=${to}`;
  // Submission check is for the last day that has already started.
  const checkDay = to > today ? today : to;

  const { projectId } = useCurrentProject();
  const manpower = useManpowerSummary(projectId, from, to);
  const manpowerPrev = useManpowerSummary(projectId, addDaysIso(from, -span), addDaysIso(from, -1));
  const contractors = useProjectContractors(projectId);
  const requests = useDailyRequests(projectId, from, to);
  const rfi = useInspectionRequests(projectId, { from, to, by: "inspection" });
  const safety = useSafetyStats(projectId, from, to);
  const findings = useSafetyFindings(projectId, addDaysIso(to, -90), to);
  const site = useSiteDay(projectId, from, to);

  const setRange = (f: string, t: string) => setParams({ from: f, to: t }, { replace: true });

  const mp = manpower.data?.data;
  const req = requests.data?.data;
  const s = safety.data?.data;
  const loading = !mp || !req || !rfi.data || !s || !site.data;

  // ---- derive vitals ----
  const avg = mp?.totals.avgDaily ?? 0;
  const prev = manpowerPrev.data?.data;
  const trend = prev && prev.totals.reportedDays ? avg - prev.totals.avgDaily : null;

  const allContractors = contractors.data?.data ?? [];
  const submitted = new Set((mp?.daily ?? []).filter((d) => d.date === checkDay).map((d) => d.contractorCode));
  const missing = allContractors.filter((c) => !submitted.has(c.code));

  const machineClash = (req?.machinery ?? []).filter((m) => m.conflict === "conflict");
  const roadClash = (req?.roads ?? []).filter((r) => r.conflict);
  const clashes = machineClash.length + roadClash.length;
  const buildings = site.data?.data.buildings ?? [];
  const permits = buildings.flatMap((b) => b.permits);

  const rfiRows = (rfi.data?.data ?? []).filter((r) => r.status !== "draft");
  const rfiWaiting = rfiRows.filter((r) => r.status === "requested" || r.status === "confirmed");
  const rfiDone = rfiRows.filter((r) => r.result);
  const rfiPassPct = rfiDone.length ? Math.round((rfiDone.filter((r) => r.result === "pass").length / rfiDone.length) * 100) : null;
  const rfiNotReady = rfiWaiting.filter((r) => r.readiness !== "ready" || !r.drawingRef);

  const allFindings = findings.data?.data ?? [];
  const openFindings = allFindings.filter((f) => f.status === "open");
  const overdue = openFindings.filter((f) => f.expectedCompleteDate && f.expectedCompleteDate < today);

  const behind = buildings.flatMap((b) =>
    b.activities.filter((a) => a.actualPercent !== null && a.actualPercent < a.planPercent).map((a) => ({ ...a, buildingName: b.name, buildingId: b.id })),
  );
  const behindBuildings = new Set(behind.map((a) => a.buildingId)).size;

  const rows: ModuleRow[] = loading
    ? []
    : [
        {
          page: "Manpower",
          icon: "manpower",
          to: `/manpower?${q}`,
          value: avg.toLocaleString(),
          unit: span > 1 ? "people / day (avg)" : "people",
          trend,
          facts: [`${mp.totals.manDays.toLocaleString()} man-days`, `${mp.totals.manHours.toLocaleString()} NMH`, `${mp.contractors.length} contractors`],
          health: "ok",
        },
        {
          page: "Daily Reports",
          icon: "dailyReports",
          to: `/daily-reports`,
          value: `${allContractors.length - missing.length}/${allContractors.length}`,
          unit: `morning reports · ${dayjs(checkDay).format("D MMM")}`,
          facts: missing.length ? [`Missing: ${missing.map((c) => c.code).join(", ")}`] : ["All contractors submitted"],
          health: missing.length ? "check" : "ok",
        },
        {
          page: "Daily Request",
          icon: "tomorrow",
          to: `/today-requests?${q}`,
          value: req.machinery.length + req.equipmentRequests.length + req.roads.length,
          unit: "requests",
          facts: [`${req.machinery.length} machine`, `${req.equipmentRequests.length} equipment`, `${req.roads.length} road`, clashes ? `${clashes} clashes` : "no clashes"],
          health: clashes ? "issue" : "ok",
        },
        {
          page: "Work Permits",
          icon: "workPermits",
          to: `/today-requests?${q}`,
          value: permits.length,
          unit: "PTW",
          facts: [`${permits.reduce((n, p) => n + p.workers, 0)} workers under permit`],
          health: "ok",
        },
        {
          page: "QAQC",
          icon: "qaqc",
          to: `/qaqc?${q}`,
          value: rfiWaiting.length,
          unit: "RFI waiting",
          facts: [`${rfiDone.length} inspected`, rfiPassPct === null ? "no results yet" : `${rfiPassPct}% first-pass`, rfiNotReady.length ? `${rfiNotReady.length} not ready` : "all ready"],
          health: rfiNotReady.length ? "check" : "ok",
        },
        {
          page: "Safety",
          icon: "safety",
          to: `/safety?${q}`,
          value: s.daysWithoutAccident.toLocaleString(),
          unit: "days without accident",
          facts: [`${s.tiles.accidents} accident · ${s.tiles.lti} LTI · ${s.tiles.nearMiss} near miss`, `${openFindings.length} open findings${overdue.length ? ` (${overdue.length} overdue)` : ""}`],
          health: s.tiles.accidents || s.tiles.lti ? "issue" : overdue.length ? "check" : "ok",
        },
        {
          page: "Site Plan",
          icon: "sitePlan",
          to: `/site-plan?${q}`,
          value: behindBuildings,
          unit: "buildings behind plan",
          facts: [`${behind.length} activities behind`, `${buildings.filter((b) => b.headcount > 0).length} buildings active`],
          health: behind.length ? "check" : "ok",
        },
      ];

  const actions: ActionItem[] = loading
    ? []
    : [
        ...machineClash.map((m) => ({
          key: `m-${m.id}`,
          severity: "issue" as const,
          page: "Daily Request",
          title: `Machine double-booked · ${m.machineType}${m.unitTag ? ` (${m.unitTag})` : ""}`,
          detail: `${m.contractorCode} · ${m.buildingName} · ${dayjs(m.targetDate).format("D MMM")} ${m.startTime ?? "all day"}`,
          to: `/today-requests?${q}`,
        })),
        ...roadClash.map((r) => ({
          key: `r-${r.id}`,
          severity: "issue" as const,
          page: "Daily Request",
          title: `Road clash · ${r.roadLocation}`,
          detail: `${r.contractorCode} · ${dayjs(r.targetDate).format("D MMM")} ${r.startTime}–${r.endTime}`,
          to: `/today-requests?${q}`,
        })),
        ...overdue.map((f) => ({
          key: `f-${f.id}`,
          severity: "issue" as const,
          page: "Safety",
          title: `Finding overdue · item ${f.itemNo}`,
          detail: `${f.contractorCode ?? "-"} · ${f.observation}`,
          to: `/safety`,
        })),
        ...rfiNotReady.map((r) => ({
          key: `q-${r.id}`,
          severity: "check" as const,
          page: "QAQC",
          title: `RFI not ready · ${inspectionTypeLabel(r.inspectionType)}`,
          detail: `${r.contractorCode} · ${r.workItem} · ${dayjs(r.inspectionDate).format("D MMM")} ${r.inspectionTime}${r.drawingRef ? "" : " · no drawing"}`,
          to: `/qaqc?${q}`,
        })),
        ...behind.slice(0, 6).map((a, i) => ({
          key: `b-${i}`,
          severity: "check" as const,
          page: "Site Plan",
          title: `Behind plan · ${a.buildingName}`,
          detail: `${a.contractorCode} · ${a.workDescription} · ${a.actualPercent}% of ${a.planPercent}%`,
          to: `/site-plan?${q}&b=${a.buildingId}`,
        })),
        ...(checkDay === today
          ? missing.map((c) => ({
              key: `n-${c.id}`,
              severity: "check" as const,
              page: "Daily Reports",
              title: `No morning report · ${c.code}`,
              detail: c.name,
              to: `/daily-reports`,
            }))
          : []),
      ];

  return (
    <Box>
      <PageHeader
        title="Project Dashboard"
        subtitle="Vital numbers from every page · click a row to open it with the same dates"
        actions={<DateRangeFields from={from} to={to} maxDays={62} onChange={setRange} />}
      />

      <Box sx={{ mb: 3 }}>
        <SiteConditionsStrip />
      </Box>

      {loading ? (
        <Stack spacing={1}>
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionTitle title="Status board" note={`${dayjs(from).format("D MMM")}${span > 1 ? ` – ${dayjs(to).format("D MMM YYYY")}` : dayjs(from).format(" YYYY")}`} />
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", overflow: "hidden" }}>
              {rows.map((r, i) => (
                <StatusRow key={r.page} row={r} last={i === rows.length - 1} />
              ))}
            </Box>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionTitle title="Needs follow-up" note={actions.length ? `${actions.length} items` : "nothing open"} />
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", maxHeight: 520, overflow: "auto" }}>
              {actions.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
                  No clashes, overdue findings or late reports in this range.
                </Typography>
              ) : (
                actions.map((a, i) => (
                  <Link
                    key={a.key}
                    component={RouterLink}
                    to={a.to}
                    underline="none"
                    color="inherit"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      borderTop: i ? 1 : 0,
                      borderColor: "divider",
                      "&:hover": { bgcolor: "grey.50" },
                      "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusChip status={HEALTH_CHIP[a.severity].status} label={a.page} />
                        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                          {a.title}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                        {a.detail}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: "text.disabled" }} />
                  </Link>
                ))
              )}
            </Box>
          </Grid>

          <Grid size={12}>
            <SectionTitle
              title="Man-days"
              note={span > 1 ? "Daily headcount, same scale for every contractor" : "Pick a longer range to see the daily pattern"}
              action={
                <Link component={RouterLink} to={`/manpower?${q}`} underline="hover" variant="body1">
                  Open Manpower
                </Link>
              }
            />
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2.5 }}>
              <ManDaySmallMultiples
                days={Array.from({ length: span }, (_, i) => addDaysIso(from, i))}
                daily={mp.daily}
                colors={contractorColorMap(mp.contractors.map((c) => c.contractorCode))}
              />
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

function SectionTitle({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.25 }}>
      <Typography variant="h4" component="h2">
        {title}
      </Typography>
      {note ? (
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
          {note}
        </Typography>
      ) : null}
      {action ? <Box sx={{ ml: "auto !important" }}>{action}</Box> : null}
    </Stack>
  );
}

function StatusRow({ row, last }: { row: ModuleRow; last: boolean }) {
  const Icon = navigationIcons[row.icon];
  const chip = HEALTH_CHIP[row.health];
  return (
    <ButtonBase
      component={RouterLink}
      to={row.to}
      sx={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: { xs: "1fr auto", md: "168px 132px minmax(0, 1fr) auto auto" },
        alignItems: "center",
        columnGap: 2,
        rowGap: 0.5,
        textAlign: "left",
        px: 2,
        py: 1.5,
        borderBottom: last ? 0 : 1,
        borderColor: "divider",
        transition: "background-color 120ms",
        "&:hover": { bgcolor: "grey.50" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Icon sx={{ color: "primary.main" }} />
        <Typography variant="h5" component="span">
          {row.page}
        </Typography>
      </Stack>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Stack direction="row" alignItems="baseline" spacing={0.75}>
          <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {row.value}
          </Typography>
          {row.trend !== undefined && row.trend !== null ? (
            <Stack direction="row" alignItems="center" sx={{ color: row.trend >= 0 ? "success.dark" : "error.main" }}>
              {row.trend >= 0 ? <TrendingUpOutlinedIcon sx={{ fontSize: 16 }} /> : <TrendingDownOutlinedIcon sx={{ fontSize: 16 }} />}
              <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700 }}>
                {row.trend >= 0 ? "+" : ""}
                {row.trend}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {row.unit}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, order: { xs: 3, md: 0 } }}>
        <Box component="span" sx={{ display: { md: "none" }, fontWeight: 700, color: "text.primary" }}>
          {row.value} {row.unit} ·{" "}
        </Box>
        {row.facts.join(" · ")}
      </Typography>
      <Box sx={{ justifySelf: "end" }}>
        <StatusChip status={chip.status} label={chip.label} />
      </Box>
      <ChevronRightIcon sx={{ color: "text.disabled", display: { xs: "none", md: "block" } }} />
    </ButtonBase>
  );
}
