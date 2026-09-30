import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { MapEditorPanel } from "@/features/zone-configuration/components/map-editor-panel.js";
import { SitePlanCanvas, type CanvasArea } from "@/features/site-plan/components/site-plan-canvas.js";
import { SitePlanViewportControls } from "@/features/site-plan/components/site-plan-viewport-controls.js";
import {
  useCanConfigureSitePlan,
  useSaveMapAreas,
} from "@/features/zone-configuration/hooks/use-map-area-mutations.js";
import { useSitePlanEditor } from "@/features/zone-configuration/hooks/use-zone-configuration-editor.js";
import { useSitePlanViewport } from "@/features/site-plan/hooks/use-site-plan-viewport.js";
import { usePlanZones, useSitePlan, useSitePlans } from "@/features/site-plan/hooks/use-site-plan.js";
import { clampToMap, polygonBounds } from "@/features/site-plan/utils/coordinates.js";
import { SITE_MAP_H, SITE_MAP_W } from "@/features/site-plan/constants.js";

// Admin screen: WBS map configuration. Separate from the operational
// Site Plan (contractor activity view) by design.
export function SitePlanConfigPage() {
  const { projectId, setProjectId, registerProjectChangeGuard } = useCurrentProject();
  const theme = useTheme();
  const canEdit = useCanConfigureSitePlan();
  const mobile = useMediaQuery("(max-width:599px)");

  const [addPointMode, setAddPointMode] = useState(false);
  const [vertexDragging, setVertexDragging] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [backgroundError, setBackgroundError] = useState(false);

  const plansQuery = useSitePlans(projectId);
  const plans = plansQuery.data?.data ?? [];
  const effectivePlanId = plans.some((p) => p.id === selectedPlanId)
    ? selectedPlanId
    : (plans.find((p) => p.isDefault)?.id ?? plans[0]?.id ?? null);
  const planQuery = useSitePlan(projectId, effectivePlanId);
  const zonesQuery = usePlanZones(projectId, "all");
  const mapW = planQuery.data?.data.background.width ?? SITE_MAP_W;
  const mapH = planQuery.data?.data.background.height ?? SITE_MAP_H;
  const viewport = useSitePlanViewport(mapW, mapH);
  const backgroundUrl = planQuery.data?.data.background.url ?? "/site-plan/master-layout-map.png";
  const backgroundUrlRef = useRef(backgroundUrl);
  const onImageLoad = useCallback(() => {
    setBackgroundError(false);
  }, []);
  const onImageError = useCallback(() => setBackgroundError(true), []);

  const serverAreas = useMemo(
    () =>
      (planQuery.data?.data.areas ?? []).map((a) => ({
        id: a.id as string,
        zone: a.zone,
        geometry: a.geometry,
        defaultGeometry: a.defaultGeometry,
        isCustom: a.isCustom,
      })),
    [planQuery.data],
  );

  const editor = useSitePlanEditor(serverAreas, mapW, mapH);
  const { cancelEdit, dirty, editMode, enterEdit } = editor;
  const { fitAll } = viewport;
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (planQuery.data && !editMode) enterEdit();
  }, [planQuery.data, editMode, enterEdit]);

  useEffect(() => {
    setSelectedPlanId(null);
    setBackgroundError(false);
  }, [projectId]);
  useEffect(() => {
    if (backgroundUrlRef.current !== backgroundUrl) {
      backgroundUrlRef.current = backgroundUrl;
      setBackgroundError(false);
    }
  }, [backgroundUrl]);
  useEffect(() => fitAll(), [effectivePlanId, fitAll]);

  useEffect(
    () =>
      registerProjectChangeGuard((id) => {
        if (dirty) {
          setPendingProjectId(id);
          setConfirmCancel(true);
        } else {
          cancelEdit();
          setBackgroundError(false);
          setProjectId(id);
        }
      }),
    [cancelEdit, dirty, projectId, registerProjectChangeGuard, setProjectId],
  );

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const saveMutation = useSaveMapAreas(projectId, planQuery.data?.data.id ?? effectivePlanId);
  const saving = saveMutation.isPending;

  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);
  const mappedZoneIds = useMemo(() => new Set(editor.drafts.map((a) => a.zoneId)), [editor.drafts]);
  const defaultAreaIds = useMemo(
    () => new Set(serverAreas.filter((a) => a.defaultGeometry != null).map((a) => a.id)),
    [serverAreas],
  );
  const customAreaIds = useMemo(() => new Set(serverAreas.filter((a) => a.isCustom).map((a) => a.id)), [serverAreas]);

  const editAreas: CanvasArea[] = useMemo(
    () =>
      editor.drafts.map((d) => {
        const zone = zones.find((z) => z.id === d.zoneId);
        return {
          key: d.key,
          points: d.points,
          fill: alpha(theme.palette.action.hover, 0.25),
          stroke: d.key === editor.selected?.key ? theme.palette.primary.main : theme.palette.divider,
          strokeWidth: d.key === editor.selected?.key ? 3 : 1.5,
          dash: d.isNew ? [10, 6] : undefined,
          code: zone?.code ?? "?",
        };
      }),
    [editor.drafts, editor.selected, theme, zones],
  );

  const handleSave = useCallback(async () => {
    if (editor.drawing) return;
    const serverById = new Map(serverAreas.map((area) => [area.id, area]));
    const areas = editor.allDrafts.flatMap((draft) => {
      if (draft.deleted) return [];
      const geometry = editor.toNormalized(draft.points);
      if (draft.isNew) return [{ zoneId: draft.zoneId, geometry }];
      const server = draft.areaId ? serverById.get(draft.areaId) : undefined;
      const samePoints =
        server &&
        geometry.points.length === server.geometry.points.length &&
        geometry.points.every(
          (point, index) =>
            point.x === server.geometry.points[index]?.x && point.y === server.geometry.points[index]?.y,
        );
      if (!server || (draft.zoneId === server.zone.id && samePoints)) {
        return [];
      }
      return [{ areaId: draft.areaId as string, zoneId: draft.zoneId, geometry }];
    });
    const deleteAreaIds = editor.allDrafts.flatMap((draft) => (draft.deleted && draft.areaId ? [draft.areaId] : []));
    try {
      await saveMutation.mutateAsync({ areas, deleteAreaIds });
      editor.cancelEdit();
      setAddPointMode(false);
    } catch {
      // The mutation error is shown in the editor panel.
    }
  }, [editor, saveMutation, serverAreas]);

  const requestPlanChange = (id: string) => {
    if (id === effectivePlanId) return;
    if (editor.dirty) {
      setPendingPlanId(id);
      setConfirmCancel(true);
    } else {
      editor.cancelEdit();
      setBackgroundError(false);
      setSelectedPlanId(id);
    }
  };

  const keepEditing = () => {
    setConfirmCancel(false);
    setPendingProjectId(null);
    setPendingPlanId(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  const discardChanges = () => {
    setConfirmCancel(false);
    setAddPointMode(false);
    editor.cancelEdit();
    if (pendingProjectId) {
      setBackgroundError(false);
      setProjectId(pendingProjectId);
    } else if (pendingPlanId) {
      setBackgroundError(false);
      setSelectedPlanId(pendingPlanId);
    } else if (blocker.state === "blocked") blocker.proceed();
    setPendingProjectId(null);
    setPendingPlanId(null);
  };

  const confirmationOpen = confirmCancel || blocker.state === "blocked";

  if (!projectId) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <Typography color="text.secondary">Select a project first.</Typography>
      </Box>
    );
  }

  if (!canEdit) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <EmptyState
          icon={<LockOutlinedIcon fontSize="large" />}
          title="Not authorized"
          description="Sign in to configure the site map."
        />
      </Box>
    );
  }

  if (mobile) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <Alert severity="info">
          Map configuration requires a tablet or desktop. Site Activity remains available on mobile.
        </Alert>
      </Box>
    );
  }

  if (plansQuery.isError) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void plansQuery.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load Site Plans.
        </Alert>
      </Box>
    );
  }

  if (plansQuery.isLoading || planQuery.isLoading) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <LinearProgress aria-label="Loading site plan" />
      </Box>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
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
      </Box>
    );
  }

  if (backgroundError) {
    return (
      <Box>
        <PageHeader title="Zone Configuration" />
        <FormControl size="small" sx={{ minWidth: 260, mb: 2 }}>
          <InputLabel id="zone-config-plan-error">Site Plan</InputLabel>
          <Select
            labelId="zone-config-plan-error"
            label="Site Plan"
            value={effectivePlanId ?? ""}
            onChange={(event) => requestPlanChange(event.target.value)}
            disabled={plans.length <= 1}
          >
            {plans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name}
                {plan.isDefault ? " (default)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <EmptyState
          icon={<MapOutlinedIcon />}
          title="No base drawing"
          description="The Site Plan drawing could not be loaded. Check the configured background and retry."
          action={
            <Button
              onClick={() => {
                void planQuery.refetch();
                setBackgroundError(false);
              }}
            >
              Retry
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="Zone Configuration" subtitle="Admin: define which polygon represents each WBS zone" />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="zone-config-plan">Site Plan</InputLabel>
          <Select
            labelId="zone-config-plan"
            label="Site Plan"
            value={effectivePlanId ?? ""}
            onChange={(event) => requestPlanChange(event.target.value)}
            disabled={plans.length <= 1}
          >
            {plans.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name}
                {plan.isDefault ? " (default)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          Mapped {mappedZoneIds.size} / {zones.length} · Unmapped {Math.max(0, zones.length - mappedZoneIds.size)}
        </Typography>
      </Stack>
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
          Failed to load project zones.
        </Alert>
      ) : null}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5, position: "relative" }}>
              <Box sx={{ height: { xs: 380, md: 560 }, borderRadius: 2, overflow: "hidden" }}>
                <SitePlanCanvas
                  backgroundUrl={backgroundUrl}
                  mapW={mapW}
                  mapH={mapH}
                  areas={editAreas}
                  selectedKey={editor.selected?.key ?? null}
                  editMode={!saving}
                  vertexHandles={
                    editor.selected
                      ? {
                          areaKey: editor.selected.key,
                          points: editor.selected.points,
                          radius: Math.max(6, 12 / viewport.view.scale),
                        }
                      : null
                  }
                  drawing={editor.drawing?.points ?? null}
                  stageDraggable={!editor.drawing && !vertexDragging && !saving}
                  viewport={viewport.view}
                  containerRef={viewport.containerRef}
                  stageRef={viewport.stageRef}
                  size={viewport.size}
                  onStageClick={() => {
                    if (!saving && editor.drawing) {
                      const pt = viewport.screenToMap();
                      if (pt) editor.pushDrawPoint(clampToMap(pt, mapW, mapH));
                    }
                  }}
                  onStageDrag={viewport.onStageDrag}
                  onAreaClick={(key) => {
                    if (saving) return;
                    if (addPointMode && editor.selected) {
                      const pt = viewport.screenToMap();
                      if (pt) editor.addVertexAt(editor.selected.key, pt);
                      return;
                    }
                    editor.select(key);
                  }}
                  onVertexDrag={(key, index, pt) => {
                    const d = editor.drafts.find((x) => x.key === key);
                    if (d) {
                      editor.updatePoints(
                        key,
                        d.points.map((p, i) => (i === index ? clampToMap(pt, mapW, mapH) : p)),
                      );
                    }
                  }}
                  onVertexDown={() => setVertexDragging(true)}
                  onVertexUp={() => setVertexDragging(false)}
                  onVertexClick={(_, index) => editor.selectVertex(index)}
                  onImageLoad={onImageLoad}
                  onImageError={onImageError}
                />
              </Box>
              <SitePlanViewportControls
                viewport={viewport}
                onFitSelected={
                  editor.selected ? () => viewport.fitBounds(polygonBounds(editor.selected!.points)) : undefined
                }
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <MapEditorPanel
                editor={editor}
                zones={zones}
                mappedZoneIds={mappedZoneIds}
                customAreaIds={customAreaIds}
                defaultAreaIds={defaultAreaIds}
                onSave={() => void handleSave()}
                saving={saving}
                saveError={saveMutation.error instanceof Error ? saveMutation.error.message : null}
                onCancel={() => {
                  if (editor.dirty) setConfirmCancel(true);
                  else editor.cancelEdit();
                }}
                addPointMode={addPointMode}
                onAddPointModeChange={setAddPointMode}
                onDeleteArea={(key) => editor.markDeleted(key, true)}
                onResetArea={(key) => editor.resetDraft(key)}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={confirmationOpen} onClose={keepEditing} maxWidth="xs" fullWidth>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Your map edits will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={keepEditing}>
            Keep editing
          </Button>
          <Button color="error" onClick={discardChanges}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
