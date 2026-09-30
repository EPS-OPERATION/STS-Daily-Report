import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Popover from "@mui/material/Popover";
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
import { ZoneInspector } from "./zone-inspector.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { useSitePlanViewport } from "../hooks/use-site-plan-viewport.js";
import { useSiteActivities } from "../hooks/use-site-activities.js";
import { usePlanZones, useSitePlan } from "../hooks/use-site-plan.js";
import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";
import { normalizedToMap, pointInPolygon, polygonBounds } from "../utils/coordinates.js";
import { aggregateZoneState, summarizeZone } from "../utils/zone-status.js";
import {
  getActivityFocusAreas,
  getBlankMapClickAction,
  getVisibleMapAreas,
  getZoneMapInteraction,
  getZoneSubtreeActivities,
} from "../utils/site-plan-map.js";
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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusedParentId, setFocusedParentId] = useState<string | null>(null);
  const [selectionPulseKey, setSelectionPulseKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ zoneId: string; x: number; y: number } | null>(null);
  const [ambiguousClick, setAmbiguousClick] = useState<{ x: number; y: number; zoneIds: string[] } | null>(null);

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
    setSelectedZoneId(null);
    setFocusedParentId(null);
    setSelectionPulseKey(0);
    setContractorId("all");
    setBackgroundError(false);
    setHoverInfo(null);
    setAmbiguousClick(null);
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

  const statusColorFor = useCallback(
    (state: ZoneState) => {
      switch (state) {
        case "blocked":
          return theme.palette.error.main;
        case "attention":
          return theme.palette.warning.main;
        case "active":
          return theme.palette.info.main;
        case "completed":
          return theme.palette.success.main;
        default:
          return theme.palette.text.secondary;
      }
    },
    [theme],
  );

  const statusLabelFor = (state: ZoneState) =>
    state === "idle" ? "Idle" : state === "completed" ? "Done" : `${state[0]!.toUpperCase()}${state.slice(1)}`;

  const childrenOf = useCallback((parentId: string) => zones.filter((z) => z.parentId === parentId), [zones]);

  // Overview renders roots; focused mode renders mapped direct children only.
  // Predictable stacking (never database order): WBS order first, selected
  // zone on top so it is never buried under a stacked neighbor.
  const renderedAreas: CanvasArea[] = useMemo(() => {
    return [...getVisibleMapAreas(serverAreas, focusedParentId)]
      .sort(
        (a, b) =>
          (selectedZoneId === a.zone.id ? 1 : 0) - (selectedZoneId === b.zone.id ? 1 : 0) ||
          a.zone.sortOrder - b.zone.sortOrder ||
          a.zone.code.localeCompare(b.zone.code),
      )
      .map((area) => {
        const state = stateOf(area.zone.id);
        const attentionStroke = state === "blocked" || state === "attention";
        const selected = selectedZoneId === area.zone.id;
        return {
          key: area.id,
          points: area.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)),
          fill: alpha(area.zone.displayColor, selected ? 0.42 : 0.3),
          stroke: selected
            ? theme.palette.primary.main
            : attentionStroke
              ? statusColorFor(state)
              : area.zone.displayColor,
          strokeWidth: selected ? 3 : attentionStroke ? 3 : 2,
          code: area.zone.code,
          statusLabel: statusLabelFor(state),
          statusColor: statusColorFor(state),
          selectionUnderstroke: selected ? theme.palette.background.paper : undefined,
        };
      });
  }, [focusedParentId, selectedZoneId, serverAreas, stateOf, statusColorFor, mapW, mapH, theme]);

  const activeKey = useMemo(() => {
    if (!selectedZoneId) return null;
    const area = serverAreas.find((a) => a.zone.id === selectedZoneId);
    return area?.id ?? null;
  }, [selectedZoneId, serverAreas]);

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    const acts = byZone.get(selectedZoneId) ?? [];
    const zone =
      acts[0]?.zone ??
      zones.find((z) => z.id === selectedZoneId) ??
      serverAreas.find((a) => a.zone.id === selectedZoneId)?.zone;
    if (!zone) return null;
    return { id: zone.id, code: zone.code, name: zone.name, state: stateOf(zone.id) };
  }, [selectedZoneId, byZone, zones, serverAreas, stateOf]);

  const hoveredArea = hoverInfo ? serverAreas.find((area) => area.zone.id === hoverInfo.zoneId) : null;
  const hoveredState = hoveredArea ? stateOf(hoveredArea.zone.id) : null;
  const hoveredSummary = hoveredArea ? summarizeZone(activitiesForZone(hoveredArea.zone.id)) : null;

  const mappedZoneIds = useMemo(() => new Set(serverAreas.map((area) => area.zone.id)), [serverAreas]);
  const rootZones = useMemo(() => zones.filter((zone) => zone.parentId === null), [zones]);
  const focusChildren = focusedParentId ? childrenOf(focusedParentId).filter((zone) => mappedZoneIds.has(zone.id)) : [];
  const focusParent = focusedParentId ? (zones.find((z) => z.id === focusedParentId) ?? null) : null;

  const focusMapToParent = useCallback(
    (zoneId: string) => {
      const areas = getActivityFocusAreas(serverAreas, zoneId);
      const points = areas.flatMap((a) => a.geometry.points.map((p) => normalizedToMap(p, mapW, mapH)));
      if (points.length > 0) fitBounds(polygonBounds(points));
      else fitAll();
    },
    [serverAreas, mapW, mapH, fitAll, fitBounds],
  );

  const navigateToParent = useCallback(
    (zoneId: string) => {
      setHoverInfo(null);
      setAmbiguousClick(null);
      setSelectedZoneId(null);
      setFocusedParentId(zoneId);
      focusMapToParent(zoneId);
    },
    [focusMapToParent],
  );

  const backToOverview = useCallback(() => {
    setHoverInfo(null);
    setAmbiguousClick(null);
    setSelectedZoneId(null);
    setFocusedParentId(null);
    fitAll();
  }, [fitAll]);

  const inspectZone = useCallback((zoneId: string) => {
    setHoverInfo(null);
    setAmbiguousClick(null);
    setSelectedZoneId(zoneId);
    setSelectionPulseKey((key) => key + 1);
  }, []);

  const activateZone = useCallback(
    (zoneId: string) => {
      if (getZoneMapInteraction(zoneId, zones) === "focus") navigateToParent(zoneId);
      else inspectZone(zoneId);
    },
    [inspectZone, navigateToParent, zones],
  );

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

  const legend = (
    [
      ["Blocked", theme.palette.error.main],
      ["Attention", theme.palette.warning.main],
      ["Active", theme.palette.info.main],
      ["Completed", theme.palette.success.main],
      ["Idle", theme.palette.text.disabled],
    ] as const
  ).map(([label, color]) => (
    <Stack key={label} direction="row" spacing={0.65} alignItems="center" sx={{ whiteSpace: "nowrap" }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  ));

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1.25}
        sx={{ mb: 1.5 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Site Activity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor contractor activity across project zones
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon fontSize="small" />}
          onClick={() => setDialogOpen(true)}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
        >
          Add Activity
        </Button>
      </Stack>

      <Stack spacing={1} sx={{ mb: 1.5 }}>
        {serverAreas.length === 0 ? (
          <Alert severity="info">No WBS zones are mapped yet. Zone Configuration can add reviewed geometry.</Alert>
        ) : null}
        {zonesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void zonesQuery.refetch()}>
                Retry
              </Button>
            }
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
          >
            Failed to load activities for this date and filter.
          </Alert>
        ) : null}
      </Stack>

      <Paper
        variant="outlined"
        sx={{ width: "100%", overflow: "hidden", borderRadius: 2, bgcolor: "background.paper" }}
      >
        <Box
          sx={{
            px: { xs: 1.25, sm: 1.5, lg: 2 },
            py: { xs: 1.25, lg: 1.5 },
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Grid container spacing={1.25} alignItems="center">
            <Grid size={{ xs: 12, lg: 3 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                {focusParent ? (
                  <>
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                      onClick={backToOverview}
                      aria-label="Back to all zones"
                      sx={{ flexShrink: 0, px: 0.75 }}
                    >
                      All Zones
                    </Button>
                    <Typography variant="body2" color="text.secondary" aria-hidden="true">
                      /
                    </Typography>
                    <Typography variant="body2" noWrap title={`${focusParent.code} ${focusParent.name}`}>
                      {focusParent.code} {focusParent.name}
                    </Typography>
                  </>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel id="sp-zone-navigation-label" shrink>
                      Navigate to area
                    </InputLabel>
                    <Select
                      labelId="sp-zone-navigation-label"
                      label="Navigate to area"
                      value=""
                      displayEmpty
                      renderValue={() => "Choose a site area"}
                      onChange={(event) => activateZone(event.target.value)}
                      inputProps={{ "aria-label": "Navigate to area" }}
                    >
                      {rootZones.map((zone) => (
                        <MenuItem key={zone.id} value={zone.id}>
                          {zone.code} {zone.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 4, lg: 3 }}>
              <DatePicker
                label="Work date"
                value={dayjs(date)}
                onChange={(value) => value?.isValid() && setDate(value.format("YYYY-MM-DD"))}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, lg: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="sp-contractor">Contractor</InputLabel>
                <Select
                  labelId="sp-contractor"
                  label="Contractor"
                  value={contractorId}
                  onChange={(event) => setContractorId(event.target.value)}
                >
                  <MenuItem value="all">All Contractors</MenuItem>
                  {(contractorsQuery.data?.data ?? []).map((contractor) => (
                    <MenuItem key={contractor.id} value={contractor.id}>
                      {contractor.code} — {contractor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4, lg: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="sp-status">Status</InputLabel>
                <Select
                  labelId="sp-status"
                  label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {focusParent ? (
          <Box sx={{ px: { xs: 1.25, sm: 1.5, lg: 2 }, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            {focusChildren.length > 0 ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{ overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "thin", pb: 0.25 }}
              >
                {focusChildren.map((zone) => (
                  <Button
                    key={zone.id}
                    size="small"
                    variant={selectedZoneId === zone.id ? "contained" : "outlined"}
                    onClick={() => activateZone(zone.id)}
                    aria-label={`Open ${zone.code} ${zone.name}`}
                    sx={{ flexShrink: 0 }}
                  >
                    {zone.code} {zone.name}
                  </Button>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No child zones are mapped on this Site Plan.
              </Typography>
            )}
          </Box>
        ) : null}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            height: { xs: "auto", lg: "clamp(520px, calc(100vh - 280px), 760px)" },
            minHeight: { lg: 520 },
          }}
        >
          <Box
            sx={{
              position: "relative",
              flex: "1 1 auto",
              minWidth: 0,
              height: { xs: "clamp(360px, 52vh, 500px)", lg: "100%" },
              minHeight: { lg: 520 },
              overflow: "hidden",
            }}
          >
            <SitePlanCanvas
              backgroundUrl={backgroundUrl}
              mapW={mapW}
              mapH={mapH}
              areas={renderedAreas}
              selectedKey={activeKey}
              selectionPulseKey={selectionPulseKey}
              editMode={false}
              vertexHandles={null}
              drawing={null}
              stageDraggable
              viewport={viewport.view}
              containerRef={viewport.containerRef}
              stageRef={viewport.stageRef}
              size={viewport.size}
              onStageClick={() => {
                setHoverInfo(null);
                setAmbiguousClick(null);
                const action = getBlankMapClickAction(selectedZoneId, focusedParentId);
                if (action === "clear-selection") setSelectedZoneId(null);
                else if (action === "back-to-overview") backToOverview();
              }}
              onStageDrag={viewport.onStageDrag}
              onAreaClick={(key, position) => {
                setHoverInfo(null);
                if (zonesQuery.isLoading) return;
                const area = serverAreas.find((item) => item.id === key);
                if (!area) return;
                // Genuine same-level ambiguity only: the click point lands
                // inside several rendered polygons. Otherwise activate directly.
                const mapPoint = viewport.screenToMap();
                const hitZoneIds =
                  mapPoint && position
                    ? [
                        ...new Set(
                          renderedAreas
                            .filter((candidate) => pointInPolygon(mapPoint, candidate.points))
                            .map((candidate) => serverAreas.find((item) => item.id === candidate.key)?.zone.id)
                            .filter((zoneId): zoneId is string => Boolean(zoneId)),
                        ),
                      ]
                    : [];
                if (hitZoneIds.length > 1) {
                  setAmbiguousClick({ x: position!.x, y: position!.y, zoneIds: hitZoneIds });
                } else {
                  setAmbiguousClick(null);
                  activateZone(area.zone.id);
                }
              }}
              onAreaHover={(key, point) => {
                if (!key || !point) {
                  setHoverInfo(null);
                  return;
                }
                const area = serverAreas.find((item) => item.id === key);
                setHoverInfo(area ? { zoneId: area.zone.id, x: point.x, y: point.y } : null);
              }}
              onVertexDrag={() => {}}
              onVertexDown={() => {}}
              onVertexUp={() => {}}
              onVertexClick={() => {}}
              onImageLoad={onImageLoad}
              onImageError={onImageError}
            />
            <SitePlanViewportControls viewport={viewport} compact />
            {hoverInfo && hoveredArea && hoveredState && hoveredSummary ? (
              <Paper
                role="tooltip"
                variant="outlined"
                sx={{
                  position: "absolute",
                  left: Math.max(8, Math.min(hoverInfo.x + 12, viewport.size.w - 232)),
                  top: Math.max(8, Math.min(hoverInfo.y + 12, viewport.size.h - 88)),
                  zIndex: 2,
                  width: 220,
                  p: 1,
                  pointerEvents: "none",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <Stack spacing={0.35}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {hoveredArea.zone.code} {hoveredArea.zone.name}
                  </Typography>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: statusColorFor(hoveredState) }} />
                    <Typography variant="caption" color="text.secondary">
                      {statusLabelFor(hoveredState)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {hoveredSummary.activityCount} activities · {hoveredSummary.workers} workers
                  </Typography>
                </Stack>
              </Paper>
            ) : null}

            <Popover
              open={ambiguousClick !== null}
              onClose={() => setAmbiguousClick(null)}
              anchorReference="anchorPosition"
              anchorPosition={ambiguousClick ? { top: ambiguousClick.y, left: ambiguousClick.x } : undefined}
              slotProps={{ paper: { sx: { p: 1, minWidth: 220 } } }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ px: 1, pt: 0.5, display: "block" }}>
                Select area
              </Typography>
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                {(ambiguousClick?.zoneIds ?? []).map((zoneId) => {
                  const zone =
                    zones.find((item) => item.id === zoneId) ??
                    serverAreas.find((item) => item.zone.id === zoneId)?.zone;
                  if (!zone) return null;
                  return (
                    <Button
                      key={zoneId}
                      size="small"
                      color="inherit"
                      sx={{ justifyContent: "flex-start" }}
                      onClick={() => {
                        setAmbiguousClick(null);
                        activateZone(zoneId);
                      }}
                    >
                      {zone.code} {zone.name}
                    </Button>
                  );
                })}
              </Stack>
            </Popover>

            <Paper
              variant="outlined"
              aria-label="Activity status legend"
              sx={{
                position: "absolute",
                right: { xs: 8, sm: 16 },
                bottom: { xs: 8, sm: 16 },
                zIndex: 1,
                p: 0.75,
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: 1,
              }}
            >
              <Button
                size="small"
                color="inherit"
                aria-expanded={legendOpen}
                aria-controls="site-activity-status-legend"
                onClick={() => setLegendOpen((open) => !open)}
                sx={{ display: { xs: "inline-flex", sm: "none" }, minWidth: 0, px: 0.75 }}
              >
                Legend
              </Button>
              <Stack
                id="site-activity-status-legend"
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 0.5, sm: 1 }}
                sx={{
                  display: { xs: legendOpen ? "flex" : "none", sm: "flex" },
                  mt: { xs: legendOpen ? 0.5 : 0, sm: 0 },
                }}
              >
                {legend}
              </Stack>
            </Paper>

            {activitiesQuery.isFetching ? (
              <LinearProgress
                aria-label="Refreshing activities"
                sx={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 3 }}
              />
            ) : null}
          </Box>

          {selectedZone ? (
            <Box
              sx={{
                width: { lg: 380 },
                flexShrink: 0,
                minWidth: 0,
                borderTop: { xs: "1px solid", lg: "none" },
                borderLeft: { lg: "1px solid" },
                borderColor: "divider",
                minHeight: { xs: 220, lg: "100%" },
              }}
            >
              <ZoneInspector
                zone={selectedZone}
                date={date}
                activities={activitiesForZone(selectedZone.id)}
                onClose={() => setSelectedZoneId(null)}
              />
            </Box>
          ) : null}
        </Box>
      </Paper>

      <ActivityDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
        zones={zones}
        defaultZoneId={selectedZoneId}
        defaultDate={date}
      />
    </Box>
  );
}
