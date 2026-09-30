import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { ActivityDialog } from "./activity-dialog.js";
import { SitePlanCanvas, type CanvasArea } from "./site-plan-canvas.js";
import { SitePlanViewportControls } from "./site-plan-viewport-controls.js";
import { ZoneDrawer } from "./zone-drawer.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { useSitePlanViewport } from "../hooks/use-site-plan-viewport.js";
import { useSiteActivities } from "../hooks/use-site-activities.js";
import { usePlanZones, useSitePlan } from "../hooks/use-site-plan.js";
import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";
import { normalizedToMap, polygonBounds } from "../utils/coordinates.js";
import { aggregateZoneState } from "../utils/zone-status.js";
import { getVisibleMapAreas, getZoneSubtreeActivities } from "../utils/site-plan-map.js";
import { SITE_MAP_H, SITE_MAP_W } from "../constants.js";

const STATUS_OPTIONS = ["All Status", "active", "attention", "blocked", "completed"];

function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Operational view (contractors everyday use): filters, status map,
// zone drawer, Add Activity. No geometry editing here — see /site-plan/config.
export function SitePlanView() {
  const theme = useTheme();
  const { projectId } = useCurrentProject();

  const [date, setDate] = useState(todayLocal());
  const [contractorId, setContractorId] = useState("all");
  const [status, setStatus] = useState("All Status");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusParentId, setFocusParentId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);

  const planQuery = useSitePlan(projectId);
  const mapW = planQuery.data?.data.background.width ?? SITE_MAP_W;
  const mapH = planQuery.data?.data.background.height ?? SITE_MAP_H;
  const backgroundUrl = planQuery.data?.data.background.url ?? "/site-plan/master-layout-map.png";
  const backgroundUrlRef = useRef(backgroundUrl);
  const zonesQuery = usePlanZones(projectId);
  const contractorsQuery = useProjectContractors(projectId);
  const activitiesQuery = useSiteActivities(projectId, {
    date,
    contractorId: contractorId === "all" ? undefined : contractorId,
    status: status === "All Status" ? undefined : status,
  });

  const viewport = useSitePlanViewport(mapW, mapH);
  const { fitAll, fitBounds } = viewport;
  const onImageLoad = useCallback(() => {
    setBackgroundError(false);
  }, []);
  const onImageError = useCallback(() => setBackgroundError(true), []);

  useEffect(() => {
    setSelectedId(null);
    setFocusParentId(null);
    setContractorId("all");
    setBackgroundError(false);
    fitAll();
  }, [projectId, fitAll]);
  useEffect(() => {
    if (backgroundUrlRef.current !== backgroundUrl) {
      backgroundUrlRef.current = backgroundUrl;
      setBackgroundError(false);
    }
  }, [backgroundUrl]);

  const serverAreas = useMemo(
    () =>
      (planQuery.data?.data.areas ?? []).map((a) => ({
        id: a.id as string,
        zone: a.zone,
        geometry: a.geometry,
      })),
    [planQuery.data],
  );

  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);

  const byZone = useMemo(() => {
    const map = new Map<string, PlanActivity[]>();
    for (const a of activitiesQuery.data?.data ?? []) {
      const list = map.get(a.zone.id) ?? [];
      list.push(a);
      map.set(a.zone.id, list);
    }
    return map;
  }, [activitiesQuery.data]);

  const activitiesForZone = useCallback(
    (zoneId: string) => getZoneSubtreeActivities(zoneId, zones, byZone),
    [byZone, zones],
  );

  const stateOf = useCallback(
    (zoneId: string): ZoneState => aggregateZoneState(activitiesForZone(zoneId)),
    [activitiesForZone],
  );

  const fillFor = useCallback(
    (state: ZoneState): { fill: string; stroke: string } => {
      switch (state) {
        case "blocked":
          return { fill: alpha(theme.palette.error.main, 0.22), stroke: theme.palette.error.main };
        case "attention":
          return { fill: alpha(theme.palette.warning.main, 0.22), stroke: theme.palette.warning.main };
        case "active":
          return { fill: alpha(theme.palette.info.main, 0.18), stroke: theme.palette.info.main };
        case "completed":
          return { fill: alpha(theme.palette.success.main, 0.18), stroke: theme.palette.success.main };
        case "idle":
        default:
          return { fill: alpha(theme.palette.text.disabled, 0.04), stroke: theme.palette.text.disabled };
      }
    },
    [theme],
  );
  const disabledText = theme.palette.text.disabled;

  const childrenOf = useCallback((parentId: string) => zones.filter((z) => z.parentId === parentId), [zones]);

  // Overview renders top-level parents only; focusing a parent renders its
  // mapped children plus a subtle parent outline (no fill, no label).
  // Hierarchy derives from AREAS (not the zones list) so the map renders
  // even if the zones query fails.
  const renderedAreas: CanvasArea[] = useMemo(() => {
    const toArea = (
      areaId: string,
      zoneId: string,
      code: string,
      opts?: { outlineOnly?: boolean },
    ): CanvasArea | null => {
      const area = serverAreas.find((a) => a.id === areaId);
      if (!area) return null;
      if (opts?.outlineOnly) {
        return {
          key: `outline-${areaId}`,
          points: area.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
          fill: alpha(disabledText, 0),
          stroke: disabledText,
          strokeWidth: 1.5,
          dash: [6, 5],
          code: "",
        };
      }
      const c = fillFor(stateOf(zoneId));
      return {
        key: areaId,
        points: area.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: 2,
        code,
      };
    };

    if (!focusParentId) {
      return getVisibleMapAreas(serverAreas, null)
        .map((a) => toArea(a.id, a.zone.id, a.zone.code))
        .filter((a): a is CanvasArea => a !== null);
    }

    const kids = getVisibleMapAreas(serverAreas, focusParentId);
    const out: CanvasArea[] = [];
    const parentArea = serverAreas.find((a) => a.zone.id === focusParentId);
    if (parentArea) {
      const outline = toArea(parentArea.id, parentArea.zone.id, "", { outlineOnly: true });
      if (outline) out.push(outline);
    }
    for (const a of kids) {
      const c = fillFor(stateOf(a.zone.id));
      out.push({
        key: a.id,
        points: a.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: 2,
        code: a.zone.code,
      });
    }
    return out;
  }, [focusParentId, serverAreas, stateOf, fillFor, mapW, mapH, disabledText]);

  const activeKey = useMemo(() => {
    if (!selectedId || focusParentId === selectedId) return null;
    const area = serverAreas.find((a) => a.zone.id === selectedId);
    return area?.id ?? null;
  }, [focusParentId, selectedId, serverAreas]);

  const selectedZone = useMemo(() => {
    if (!selectedId) return null;
    const acts = byZone.get(selectedId) ?? [];
    const zone =
      acts[0]?.zone ??
      zones.find((z) => z.id === selectedId) ??
      serverAreas.find((a) => a.zone.id === selectedId)?.zone;
    if (!zone) return null;
    return { id: zone.id, code: zone.code, name: zone.name, state: stateOf(zone.id) };
  }, [selectedId, byZone, zones, serverAreas, stateOf]);

  const focusChildren = focusParentId ? childrenOf(focusParentId) : [];
  const focusParent = focusParentId ? (zones.find((z) => z.id === focusParentId) ?? null) : null;
  const overviewParents = zones.filter((z) => !z.parentId);

  const focusArea = useCallback(
    (zoneId: string) => {
      const parentArea = serverAreas.find((a) => a.zone.id === zoneId);
      const areas = parentArea ? [parentArea] : serverAreas.filter((a) => a.zone.parentId === zoneId);
      const points = areas.flatMap((a) => a.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)));
      if (points.length > 0) fitBounds(polygonBounds(points));
      else fitAll();
    },
    [serverAreas, mapW, mapH, fitAll, fitBounds],
  );

  const navigateToParent = useCallback(
    (zoneId: string) => {
      setSelectedId(null);
      setFocusParentId(zoneId);
      focusArea(zoneId);
    },
    [focusArea],
  );

  const backToOverview = useCallback(() => {
    setSelectedId(null);
    setFocusParentId(null);
    fitAll();
  }, [fitAll]);

  const selectZone = useCallback(
    (zoneId: string | null) => {
      setSelectedId(zoneId);
      if (zoneId) {
        const kids = childrenOf(zoneId);
        if (kids.length > 0) {
          setFocusParentId(zoneId);
          focusArea(zoneId);
        }
      }
    },
    [childrenOf, focusArea],
  );

  const fitSelected = useCallback(() => {
    const area = selectedId ? serverAreas.find((a) => a.zone.id === selectedId) : null;
    if (area) {
      fitBounds(polygonBounds(area.geometry.points.map((p) => normalizedToMap(p, mapW, mapH))));
    } else fitAll();
  }, [selectedId, serverAreas, mapW, mapH, fitAll, fitBounds]);

  if (!projectId) {
    return <Typography color="text.secondary">Select a project to view its site plan.</Typography>;
  }

  if (planQuery.isLoading) {
    return (
      <Box sx={{ py: 6 }}>
        <LinearProgress aria-label="Loading site plan" />
      </Box>
    );
  }

  if (planQuery.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void planQuery.refetch()}>
            Retry
          </Button>
        }
      >
        Failed to load the site plan.
      </Alert>
    );
  }

  if (!planQuery.data) {
    return (
      <Alert severity="info">
        No site plan configured for this project — the drawing is shown without mapped zones.
      </Alert>
    );
  }

  if (backgroundError) {
    return (
      <EmptyState
        icon={<MapOutlinedIcon />}
        title="No base drawing"
        description="The Site Plan drawing could not be loaded. Check the configured background and retry."
        action={<Button onClick={() => setBackgroundError(false)}>Retry</Button>}
      />
    );
  }

  return (
    <Box>
      {serverAreas.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No WBS zones are mapped yet. Zone Configuration can add reviewed geometry.
        </Alert>
      ) : null}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
              <DatePicker
                label="Work date"
                value={dayjs(date)}
                onChange={(v) => v?.isValid() && setDate(v.format("YYYY-MM-DD"))}
                slotProps={{ textField: { size: "small" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="sp-contractor">Contractor</InputLabel>
                <Select
                  labelId="sp-contractor"
                  label="Contractor"
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                >
                  <MenuItem value="all">All Contractors</MenuItem>
                  {(contractorsQuery.data?.data ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="sp-status">Status</InputLabel>
                <Select labelId="sp-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{ textAlign: { lg: "right" } }}>
              <Button startIcon={<AddOutlinedIcon fontSize="small" />} onClick={() => setDialogOpen(true)}>
                Add Activity
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {zonesQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void zonesQuery.refetch()}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Failed to load WBS zones.
        </Alert>
      ) : null}
      {contractorsQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void contractorsQuery.refetch()}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Failed to load project contractors.
        </Alert>
      ) : null}
      {activitiesQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void activitiesQuery.refetch()}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Failed to load activities for this date and filter.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          WBS Navigation
        </Typography>
        {focusParent ? (
          <>
            <Typography variant="body2" color="text.secondary">
              /
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {focusParent.code} {focusParent.name}
            </Typography>
          </>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
        <Chip
          label="All Zones"
          clickable
          color={!focusParentId ? "primary" : "default"}
          variant={!focusParentId ? "filled" : "outlined"}
          onClick={backToOverview}
          aria-label="Show all top-level zones"
        />
        {overviewParents.map((z) => (
          <Chip
            key={z.id}
            label={`${z.code} ${z.name}`}
            clickable
            color={focusParentId === z.id ? "primary" : "default"}
            variant={focusParentId === z.id ? "filled" : "outlined"}
            onClick={() => navigateToParent(z.id)}
            aria-label={`Focus zone ${z.code} ${z.name}`}
          />
        ))}
      </Stack>

      {focusParent ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
          {focusChildren.map((z) => {
            const mapped = serverAreas.some((a) => a.zone.id === z.id);
            const state = stateOf(z.id);
            return (
              <Chip
                key={z.id}
                label={z.code}
                clickable
                title={`${z.name}${mapped ? "" : " — unmapped"}`}
                aria-label={`Zone ${z.code} ${z.name}, ${state}${mapped ? "" : ", unmapped"}`}
                color={selectedId === z.id ? "primary" : "default"}
                variant={selectedId === z.id ? "filled" : "outlined"}
                onClick={() => setSelectedId(z.id)}
              />
            );
          })}
        </Stack>
      ) : null}

      <Stack direction="row" spacing={2} sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1 }}>
        {(
          [
            ["Blocked", theme.palette.error.main],
            ["Attention", theme.palette.warning.main],
            ["Active", theme.palette.info.main],
            ["Completed", theme.palette.success.main],
            ["No activity", theme.palette.text.disabled],
          ] as const
        ).map(([label, color]) => (
          <Stack key={label} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Card>
        <CardContent sx={{ p: 2.5, position: "relative" }}>
          <Box sx={{ height: { xs: 380, md: 520 }, borderRadius: 2, overflow: "hidden" }}>
            <SitePlanCanvas
              backgroundUrl={backgroundUrl}
              mapW={mapW}
              mapH={mapH}
              areas={renderedAreas}
              selectedKey={activeKey}
              editMode={false}
              vertexHandles={null}
              drawing={null}
              stageDraggable
              viewport={viewport.view}
              containerRef={viewport.containerRef}
              stageRef={viewport.stageRef}
              size={viewport.size}
              onStageClick={() => setSelectedId(null)}
              onStageDrag={viewport.onStageDrag}
              onAreaClick={(key) => {
                const area = serverAreas.find((a) => a.id === key);
                if (area) selectZone(area.zone.id);
              }}
              onVertexDrag={() => {}}
              onVertexDown={() => {}}
              onVertexUp={() => {}}
              onVertexClick={() => {}}
              onImageLoad={onImageLoad}
              onImageError={onImageError}
            />
          </Box>
          <SitePlanViewportControls viewport={viewport} onFitSelected={selectedZone ? fitSelected : undefined} />
          {activitiesQuery.isFetching ? <LinearProgress sx={{ mt: 1 }} aria-label="Refreshing activities" /> : null}
        </CardContent>
      </Card>

      <ZoneDrawer
        zone={selectedZone}
        date={date}
        activities={selectedId ? activitiesForZone(selectedId) : []}
        onClose={() => setSelectedId(null)}
        onAdd={() => setDialogOpen(true)}
      />

      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        zones={zones}
        defaultZoneId={selectedId}
        defaultDate={date}
      />
    </Box>
  );
}
