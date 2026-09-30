import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";
import {
  BuildingActivityMatrix,
  MachineryAllocationTable,
  WorkloadLegend,
  addDaysIso,
  mondayOf,
  todayIso,
  useWeeklySummary,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { HttpError } from "@/services/http/client.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Weekly coordination meeting view (desktop-first): who works in which building
// each day, labour density, high-risk permits, and machinery double-bookings.
export function WeeklyBuildingSummaryPage() {
  const [params, setParams] = useSearchParams();
  const today = todayIso();
  const weekStart = mondayOf(ISO_DATE.test(params.get("week") ?? "") ? params.get("week")! : today);
  const { projectId } = useCurrentProject();
  const summary = useWeeklySummary(projectId, weekStart);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  const goWeek = (delta: number) => {
    const p = new URLSearchParams(params);
    p.set("week", addDaysIso(weekStart, delta * 7));
    setParams(p, { replace: true });
  };

  const data = summary.data?.data;
  const error = summary.error instanceof HttpError ? summary.error : null;
  const busiest = data?.buildings.reduce<(typeof data.buildings)[number] | null>(
    (best, b) => (!best || b.peakHeadcount > best.peakHeadcount ? b : best),
    null,
  );
  const hotCells = data?.buildings.reduce((s, b) => s + b.cells.filter((c) => c.level === "high").length, 0) ?? 0;

  return (
    <Box>
      <PageHeader
        title="Weekly Building Summary"
        subtitle="Weekly coordination meeting · allocation by building from contractor morning check-ins"
        actions={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton aria-label="Previous week" onClick={() => goWeek(-1)}>
              <ChevronLeftOutlinedIcon />
            </IconButton>
            <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 190, textAlign: "center" }}>
              {dayjs(weekStart).format("D MMM")} – {dayjs(addDaysIso(weekStart, 6)).format("D MMM YYYY")}
            </Typography>
            <IconButton aria-label="Next week" onClick={() => goWeek(1)}>
              <ChevronRightOutlinedIcon />
            </IconButton>
            <Button variant="outlined" size="small" onClick={() => setParams({}, { replace: true })} disabled={weekStart === mondayOf(today)}>
              This week
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load the weekly summary: {error.message}
        </Alert>
      ) : null}

      {!data ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={96} />
          <Skeleton variant="rounded" height={480} />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {summary.isFetching ? <LinearProgress sx={{ position: "fixed", top: 64, left: 0, right: 0, zIndex: 10 }} /> : null}

          <Grid container spacing={2}>
            <Stat label="Man-days this week" value={data.totals.manDays.toLocaleString()} sub="Sum of daily building headcount" />
            <Stat
              label="Man-hours (NMH)"
              value={data.totals.manHours.toLocaleString()}
              sub="Headcount × (normal hours + OT)"
            />
            <Stat
              label="Busiest building"
              value={busiest && busiest.peakHeadcount > 0 ? busiest.name : "—"}
              sub={busiest && busiest.peakHeadcount > 0 ? `Peak ${busiest.peakHeadcount} people / day` : "No work reported"}
            />
            <Stat label="High-density building-days" value={String(hotCells)} sub="Congested areas to coordinate" tone={hotCells ? "warning" : undefined} />
            <Stat
              label="Machinery double-bookings"
              value={String(data.totals.conflicts)}
              sub={`Overlapping pairs · ${data.totals.possibleConflicts} more to check (no unit no.) · ${data.totals.bookings} bookings`}
              tone={data.totals.conflicts ? "error" : undefined}
            />
            <Stat
              label="QAQC requests"
              value={String(
                data.requests.requested + data.requests.confirmed + data.requests.inspected + data.requests.closed,
              )}
              sub={`${data.requests.requested} awaiting confirm · ${data.requests.confirmed} to inspect · ${data.requests.closed} closed`}
              to="/qaqc"
            />
          </Grid>

          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="h5">Building Activity Matrix & Workload Heatmap</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Contractor badges show headcount per contractor. Icons mark high-risk permits. Hover a cell for detail.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />}
                  label="Hide idle buildings"
                />
              </Stack>
              <Box sx={{ mb: 1.5 }}>
                <WorkloadLegend />
              </Box>
              <BuildingActivityMatrix days={data.days} rows={data.buildings} today={today} hideEmpty={hideEmpty} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="h5">Machinery & Request Allocation</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Where each machine is booked, and overlapping bookings of the same unit.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={<Switch checked={onlyConflicts} onChange={(e) => setOnlyConflicts(e.target.checked)} />}
                  label="Conflicts only"
                />
              </Stack>
              <MachineryAllocationTable bookings={data.machinery} onlyConflicts={onlyConflicts} />
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  to,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warning" | "error";
  to?: string;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}>
      <Card
        {...(to ? { component: RouterLink, to } : {})}
        sx={{
          height: "100%",
          display: "block",
          textDecoration: "none",
          borderLeft: tone ? 4 : undefined,
          borderLeftColor: tone ? `${tone}.main` : undefined,
        }}
      >
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h3" sx={{ my: 0.5, color: tone ? `${tone}.dark` : "text.primary" }} noWrap>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
