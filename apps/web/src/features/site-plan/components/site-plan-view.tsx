import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
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
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { ActivityDialog } from "./activity-dialog.js";
import { SitePlanCanvas, type CanvasArea } from "./site-plan-canvas.js";
import { ZoneDrawer } from "./zone-drawer.js";
import { useSitePlanViewport } from "../hooks/use-site-plan-viewport.js";
import { useSiteActivities } from "../hooks/use-site-activities.js";
import { usePlanZones, useSitePlan } from "../hooks/use-site-plan.js";
import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";
import { normalizedToMap, polygonBounds } from "../utils/coordinates.js";
import { aggregateZoneState } from "../utils/zone-status.js";

// Map space = base drawing natural pixels (master-layout-map.png 1586x992).
export const SITE_MAP_W = 1586;
export const SITE_MAP_H = 992;

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

  const planQuery = useSitePlan(projectId);
  const zonesQuery = usePlanZones(projectId);
  const contractorsQuery = useProjectContractors(projectId);
  const activitiesQuery = useSiteActivities(projectId, {
    date,
    contractorId: contractorId === "all" ? undefined : contractorId,
    status: status === "All Status" ? undefined : status,
  });

  const viewport = useSitePlanViewport(SITE_MAP_W, SITE_MAP_H);

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

  const stateOf = useCallback(
    (zoneId: string): ZoneState => {
      // Parents roll up descendant activities so overview reflects the subtree.
      const acts: PlanActivity[] = [...(byZone.get(zoneId) ?? [])];
      const walk = (id: string) => {
        for (const z of zones.filter((zz) => zz.parentId === id)) {
          const list = byZone.get(z.id);
          if (list) acts.push(...list);
          walk(z.id);
        }
      };
      walk(zoneId);
      return aggregateZoneState(acts);
    },
    [byZone, zones],
  );

  const fillFor = useCallback(
    (state: ZoneState): { fill: string; stroke: string; fillOpacity: number } => {
      switch (state) {
        case "blocked":
          return { fill: theme.palette.error.main, stroke: theme.palette.error.main, fillOpacity: 0.22 };
        case "attention":
          return { fill: theme.palette.warning.main, stroke: theme.palette.warning.main, fillOpacity: 0.22 };
        case "active":
          return { fill: theme.palette.info.main, stroke: theme.palette.info.main, fillOpacity: 0.18 };
        case "completed":
          return { fill: theme.palette.success.main, stroke: theme.palette.success.main, fillOpacity: 0.18 };
        case "idle":
        default:
          return { fill: "#98A2B3", stroke: "#98A2B3", fillOpacity: 0.06 };
      }
    },
    [theme],
  );

  const childrenOf = useCallback(
    (parentId: string) => zones.filter((z) => z.parentId === parentId),
    [zones],
  );

  const mappedZoneIds = useMemo(() => new Set(serverAreas.map((a) => a.zone.id)), [serverAreas]);

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
          points: area.geometry.points.map((p) => normalizedToMap(p, SITE_MAP_W, SITE_MAP_H)),
          fill: "#98A2B3",
          stroke: "#98A2B3",
          strokeWidth: 1.5,
          dash: [6, 5],
          fillOpacity: 0,
          code: "",
        };
      }
      const c = fillFor(stateOf(zoneId));
      return {
        key: areaId,
        points: area.geometry.points.map((p) => normalizedToMap(p, SITE_MAP_W, SITE_MAP_H)),
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: 2,
        fillOpacity: c.fillOpacity,
        code,
      };
    };

    if (!focusParentId) {
      return serverAreas
        .filter((a) => !a.zone.parentId)
        .map((a) => toArea(a.id, a.zone.id, a.zone.code))
        .filter((a): a is CanvasArea => a !== null);
    }

    const kids = serverAreas.filter((a) => a.zone.parentId === focusParentId);
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
        points: a.geometry.points.map((p) => normalizedToMap(p, SITE_MAP_W, SITE_MAP_H)),
        fill: c.fill,
        stroke: c.stroke,
        strokeWidth: 2,
        fillOpacity: c.fillOpacity,
        code: a.zone.code,
      });
    }
    return out;
  }, [focusParentId, serverAreas, stateOf, fillFor]);

  const activeKey = useMemo(() => {
    if (!selectedId) return null;
    const area = serverAreas.find((a) => a.zone.id === selectedId);
    return area?.id ?? null;
  }, [selectedId, serverAreas]);

  const selectedZone = useMemo(() => {
    if (!selectedId) return null;
    const acts = byZone.get(selectedId) ?? [];
    const zone = acts[0]?.zone ?? zones.find((z) => z.id === selectedId);
    if (!zone) return null;
    return { id: zone.id, code: zone.code, name: zone.name };
  }, [selectedId, byZone, zones]);

  const focusChildren = focusParentId ? childrenOf(focusParentId).filter((z) => mappedZoneIds.has(z.id)) : [];
  const focusParent = focusParentId ? zones.find((z) => z.id === focusParentId) ?? null : null;
  const overviewParents = zones.filter((z) => !z.parentId && mappedZoneIds.has(z.id));

  const focusArea = (zoneId: string) => {
    const area = serverAreas.find((a) => a.zone.id === zoneId);
    if (area) {
      const pts = area.geometry.points.map((p) => normalizedToMap(p, SITE_MAP_W, SITE_MAP_H));
      viewport.fitBounds(polygonBounds(pts));
    }
  };

  const selectZone = useCallback(
    (zoneId: string | null) => {
      setSelectedId(zoneId);
      if (zoneId) {
        const kids = childrenOf(zoneId).filter((z) => mappedZoneIds.has(z.id));
        if (kids.length > 0) {
          setFocusParentId(zoneId);
          focusArea(zoneId);
        } else {
          setFocusParentId(null);
        }
      } else {
        setFocusParentId(null);
        viewport.fitAll();
      }
    },
    // focusArea reads serverAreas via closure-safe lookup each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childrenOf, mappedZoneIds, serverAreas, viewport],
  );

  const fitSelected = useCallback(() => {
    const area = renderedAreas.find((a) => a.key === activeKey);
    if (area) viewport.fitBounds(polygonBounds(area.points));
    else viewport.fitAll();
  }, [renderedAreas, activeKey, viewport]);

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

  const backgroundUrl = planQuery.data.data.background.url ?? "/site-plan/master-layout-map.png";

  return (
    <Box>
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

      <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
        <Typography variant="body2" color={focusParent ? "text.secondary" : "text.primary"} sx={{ fontWeight: focusParent ? 400 : 600 }}>
          All Zones
        </Typography>
        {focusParent ? (
          <>
            <Typography variant="body2" color="text.secondary">
              /
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {focusParent.code} {focusParent.name}
            </Typography>
            <Button size="small" variant="text" onClick={() => selectZone(null)}>
              Back to All Zones
            </Button>
          </>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
        {focusParent ? (
          focusChildren.map((z) => (
            <Chip
              key={z.id}
              label={z.code}
              clickable
              color={selectedId === z.id ? "primary" : "default"}
              variant={selectedId === z.id ? "filled" : "outlined"}
              onClick={() => setSelectedId(z.id)}
            />
          ))
        ) : (
          overviewParents.map((z) => (
            <Chip
              key={z.id}
              label={z.code}
              clickable
              color={selectedId === z.id ? "primary" : "default"}
              variant={selectedId === z.id ? "filled" : "outlined"}
              onClick={() => selectZone(z.id)}
            />
          ))
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
        {(
          [
            ["Blocked", "#DC2626"],
            ["Attention", "#F59E0B"],
            ["Active", "#2787FF"],
            ["Completed", "#16A34A"],
            ["No activity", "#98A2B3"],
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
              mapW={SITE_MAP_W}
              mapH={SITE_MAP_H}
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
              onWheelNative={(e) => viewport.onWheelNative(e)}
              onStageClick={() => selectZone(null)}
              onAreaClick={(key) => {
                const area = serverAreas.find((a) => a.id === key);
                if (area) selectZone(area.zone.id);
              }}
              onVertexDrag={() => {}}
              onVertexDown={() => {}}
              onVertexUp={() => {}}
              onVertexClick={() => {}}
              onImageLoad={() => viewport.fitAll()}
            />
          </Box>
          <Stack direction="row" spacing={1} sx={{ position: "absolute", left: 32, bottom: 32 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => viewport.zoomBy(1.25)}
              aria-label="Zoom in"
              sx={{ minWidth: 40, bgcolor: "background.paper" }}
            >
              <ZoomInOutlinedIcon fontSize="small" />
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => viewport.zoomBy(0.8)}
              aria-label="Zoom out"
              sx={{ minWidth: 40, bgcolor: "background.paper" }}
            >
              <ZoomOutOutlinedIcon fontSize="small" />
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => viewport.fitAll()}
              aria-label="Fit map"
              sx={{ minWidth: 40, bgcolor: "background.paper" }}
            >
              <FitScreenOutlinedIcon fontSize="small" />
            </Button>
            {selectedZone ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={fitSelected}
                aria-label="Fit selected zone"
                sx={{ bgcolor: "background.paper" }}
              >
                Fit zone
              </Button>
            ) : null}
          </Stack>
          {activitiesQuery.isFetching ? <LinearProgress sx={{ mt: 1 }} aria-label="Refreshing activities" /> : null}
        </CardContent>
      </Card>

      <ZoneDrawer
        zone={selectedZone}
        date={date}
        activities={selectedId ? (byZone.get(selectedId) ?? []) : []}
        onClose={() => selectZone(null)}
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
