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
import Paper from "@mui/material/Paper";
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
import { SelectionToolbar } from "@/features/zone-configuration/components/selection-toolbar.js";
import { SitePlanCanvas, type CanvasArea } from "@/features/site-plan/components/site-plan-canvas.js";
import { SitePlanViewportControls } from "@/features/site-plan/components/site-plan-viewport-controls.js";
import {
  useCanConfigureSitePlan,
  useSaveMapAreas,
} from "@/features/zone-configuration/hooks/use-map-area-mutations.js";
import { useSitePlanEditor } from "@/features/zone-configuration/hooks/use-zone-configuration-editor.js";
import { getConfigMapClickAction } from "@/features/zone-configuration/utils/map-interaction.js";
import { normalizeZoneColor } from "@/features/zone-configuration/utils/zone-color.js";
import { useSitePlanViewport } from "@/features/site-plan/hooks/use-site-plan-viewport.js";
import { usePlanZones, useSitePlan, useSitePlans } from "@/features/site-plan/hooks/use-site-plan.js";
import {
  clampToMap,
  polygonBounds,
  polygonCenter,
  resizeHandlePositions,
  resizeScales,
  rotatePoints,
  scalePoints,
  translatePointsWithinMap,
  type ResizeHandleId,
} from "@/features/site-plan/utils/coordinates.js";
import { getFocusedMapAreas, getVisibleConfigurationAreas } from "@/features/site-plan/utils/site-plan-map.js";
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
  const rotateStartRef = useRef<{
    key: string;
    startAngle: number;
    origPoints: { x: number; y: number }[];
    center: { x: number; y: number };
  } | null>(null);
  const resizeStartRef = useRef<{
    key: string;
    handleId: ResizeHandleId;
    origPoints: { x: number; y: number }[];
    origBounds: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [focusedParentId, setFocusedParentId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [backgroundError, setBackgroundError] = useState(false);
  const [zoneColorDrafts, setZoneColorDrafts] = useState<Record<string, string>>({});

  const plansQuery = useSitePlans(projectId);
  const plans = plansQuery.data?.data ?? [];
  const effectivePlanId = plans.some((p) => p.id === selectedPlanId)
    ? selectedPlanId
    : (plans.find((p) => p.isDefault)?.id ?? plans[0]?.id ?? null);
  const planQuery = useSitePlan(projectId, effectivePlanId);
  const zonesQuery = usePlanZones(projectId, "all");
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);
  const displayZones = useMemo(
    () =>
      zones.map((zone) => {
        const color = normalizeZoneColor(zoneColorDrafts[zone.id] ?? "");
        return color ? { ...zone, displayColor: color } : zone;
      }),
    [zones, zoneColorDrafts],
  );
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
  const { cancelEdit, editMode, enterEdit } = editor;
  const zoneColorsDirty = Object.entries(zoneColorDrafts).some(([zoneId, value]) => {
    const zone = zones.find((item) => item.id === zoneId);
    return !zone || normalizeZoneColor(value) !== zone.displayColor;
  });
  const hasInvalidZoneColor = Object.entries(zoneColorDrafts).some(([zoneId, value]) =>
    zones.some((zone) => zone.id === zoneId) ? normalizeZoneColor(value) === null : true,
  );
  const configDirty = editor.dirty || zoneColorsDirty;
  const { fitAll } = viewport;
  const blocker = useBlocker(configDirty);

  useEffect(() => {
    if (planQuery.data && !editMode) enterEdit();
  }, [planQuery.data, editMode, enterEdit]);

  useEffect(() => {
    setSelectedPlanId(null);
    setBackgroundError(false);
    setFocusedParentId(null);
    setAddPointMode(false);
    setZoneColorDrafts({});
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
        if (configDirty) {
          setPendingProjectId(id);
          setConfirmCancel(true);
        } else {
          cancelEdit();
          setBackgroundError(false);
          setProjectId(id);
        }
      }),
    [cancelEdit, configDirty, projectId, registerProjectChangeGuard, setProjectId],
  );

  useEffect(() => {
    if (!configDirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [configDirty]);

  const saveMutation = useSaveMapAreas(projectId, planQuery.data?.data.id ?? effectivePlanId);
  const saving = saveMutation.isPending;

  const mappedZoneIds = useMemo(() => new Set(editor.drafts.map((a) => a.zoneId)), [editor.drafts]);
  const defaultAreaIds = useMemo(
    () => new Set(serverAreas.filter((a) => a.defaultGeometry != null).map((a) => a.id)),
    [serverAreas],
  );
  const areaDrafts = useMemo(
    () =>
      editor.drafts.flatMap((draft) => {
        const zone = displayZones.find((item) => item.id === draft.zoneId);
        return zone ? [{ ...draft, zone }] : [];
      }),
    [editor.drafts, displayZones],
  );
  const visibleDrafts = useMemo(
    () => getVisibleConfigurationAreas(areaDrafts, focusedParentId),
    [areaDrafts, focusedParentId],
  );

  const focusZone = (zoneId: string) => {
    const zone = displayZones.find((item) => item.id === zoneId);
    const hasChildren = displayZones.some((item) => item.parentId === zoneId);
    const contextId = hasChildren ? zoneId : (zone?.parentId ?? zoneId);
    setFocusedParentId(contextId);
    const points = getFocusedMapAreas(areaDrafts, contextId).flatMap((area) => area.points);
    if (points.length > 0) viewport.fitBounds(polygonBounds(points));
    else fitAll();
  };

  const selectZone = (zoneId: string | null) => {
    setAddPointMode(false);
    if (zoneId && !mappedZoneIds.has(zoneId) && editor.drawing?.zoneId !== zoneId) {
      // Panel is selection-only: picking an unmapped zone starts drawing its
      // boundary immediately (Finish/Cancel lives on the map overlay).
      editor.startDrawing(zoneId);
    } else {
      editor.selectZone(zoneId);
    }
    if (zoneId) focusZone(zoneId);
  };

  const changeZoneColor = (zoneId: string, value: string) => {
    const zone = zones.find((item) => item.id === zoneId);
    const normalized = normalizeZoneColor(value);
    setZoneColorDrafts((previous) => {
      const next = { ...previous };
      if (zone && normalized === zone.displayColor) delete next[zoneId];
      else next[zoneId] = value;
      return next;
    });
  };

  const zoneColorChanges = useMemo(
    () =>
      zones.flatMap((zone) => {
        const color = normalizeZoneColor(zoneColorDrafts[zone.id] ?? "");
        return color && color !== zone.displayColor ? [{ zoneId: zone.id, displayColor: color }] : [];
      }),
    [zones, zoneColorDrafts],
  );

  const editAreas: CanvasArea[] = useMemo(
    () =>
      visibleDrafts.map((d) => {
        const isParent = displayZones.some((zone) => zone.parentId === d.zone.id);
        const isSelected = editor.selectedZoneId === d.zone.id;
        return {
          key: d.key,
          points: d.points,
          fill: isParent ? alpha(d.zone.displayColor, 0.05) : alpha(d.zone.displayColor, isSelected ? 0.42 : 0.3),
          stroke: isSelected ? theme.palette.primary.main : d.zone.displayColor,
          strokeWidth: isSelected ? 3 : isParent ? 2 : 2,
          dash: d.isNew ? [10, 6] : isParent ? [6, 4] : undefined,
          code: d.zone.code,
          selectionUnderstroke: isSelected ? theme.palette.background.paper : undefined,
        };
      }),
    [visibleDrafts, editor.selectedZoneId, theme, displayZones],
  );

  // Blue rotate handle floats above the selection (map units, scale-compensated).
  const rotateHandle = useMemo(() => {
    if (!editor.selected || saving || editor.drawing) return null;
    const points = editor.selected.points;
    if (points.length === 0) return null;
    const center = polygonCenter(points);
    const bounds = polygonBounds(points);
    return {
      areaKey: editor.selected.key,
      x: center.x,
      y: bounds.y - 28 / viewport.view.scale,
      centerX: center.x,
      centerY: center.y,
      radius: 8 / viewport.view.scale,
    };
  }, [editor.selected, saving, editor.drawing, viewport.view.scale]);

  // Floating quick-pill anchor: top-center of the selection in screen pixels,
  // clamped inside the map box.
  const toolbarPos = useMemo(() => {
    if (!editor.selected || saving || editor.drawing) return null;
    const points = editor.selected.points;
    if (points.length === 0 || viewport.size.w === 0) return null;
    const bounds = polygonBounds(points);
    const scale = viewport.view.scale;
    const rawX = (bounds.x + bounds.w / 2) * scale + viewport.view.x;
    const rawY = bounds.y * scale + viewport.view.y - 12;
    return {
      x: Math.min(Math.max(rawX, 120), Math.max(120, viewport.size.w - 120)),
      y: Math.max(rawY, 52),
    };
  }, [editor.selected, saving, editor.drawing, viewport.view, viewport.size]);

  const duplicateTarget = useMemo(
    () => displayZones.find((zone) => !mappedZoneIds.has(zone.id)) ?? null,
    [displayZones, mappedZoneIds],
  );

  // Edge resize squares: e/w stretch length, n/s stretch height.
  const resizeHandles = useMemo(() => {
    if (!editor.selected || saving || editor.drawing) return null;
    const points = editor.selected.points;
    if (points.length === 0) return null;
    return {
      areaKey: editor.selected.key,
      size: 10 / viewport.view.scale,
      handles: resizeHandlePositions(polygonBounds(points)).filter((h) => ["n", "s", "e", "w"].includes(h.id)),
    };
  }, [editor.selected, saving, editor.drawing, viewport.view.scale]);

  // Shared selection actions for the top bar + floating quick pill.
  const selectedZoneCode = displayZones.find((zone) => zone.id === editor.selected?.zoneId)?.code ?? "?";
  const canDeleteVertex = editor.selectedVertex != null && (editor.selected?.points.length ?? 0) > 3;
  const canResetSelection = Boolean(
    editor.selected?.areaId && editor.selected.areaId && defaultAreaIds.has(editor.selected.areaId),
  );
  const selectedColorHex = displayZones.find((zone) => zone.id === editor.selectedZoneId)?.displayColor ?? null;
  const handleDeleteVertex = () => {
    if (
      editor.selectedVertex != null &&
      editor.selected &&
      editor.deleteVertex(editor.selected.key, editor.selectedVertex)
    ) {
      editor.selectVertex(null);
    }
  };
  const handleDuplicateSelection = () => {
    if (editor.selected && duplicateTarget) {
      editor.duplicateDraft(editor.selected.key, duplicateTarget.id);
      setAddPointMode(false);
      focusZone(duplicateTarget.id);
    }
  };
  const handleResetSelection = () => {
    if (editor.selected) editor.resetDraft(editor.selected.key);
  };
  const handleRemoveSelection = () => {
    if (editor.selected) {
      setAddPointMode(false);
      editor.markDeleted(editor.selected.key, true);
    }
  };
  const handleDeselect = () => {
    setAddPointMode(false);
    editor.selectZone(null);
  };

  const handleSave = useCallback(async () => {
    if (editor.drawing || hasInvalidZoneColor) return;
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
      await saveMutation.mutateAsync({ areas, deleteAreaIds, zoneColors: zoneColorChanges });
      editor.cancelEdit();
      setZoneColorDrafts({});
      setAddPointMode(false);
    } catch {
      // The mutation error is shown in the editor panel.
    }
  }, [editor, hasInvalidZoneColor, saveMutation, serverAreas, zoneColorChanges]);

  const requestPlanChange = (id: string) => {
    if (id === effectivePlanId) return;
    if (configDirty) {
      setPendingPlanId(id);
      setConfirmCancel(true);
    } else {
      editor.cancelEdit();
      setZoneColorDrafts({});
      setBackgroundError(false);
      setFocusedParentId(null);
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
    setZoneColorDrafts({});
    editor.cancelEdit();
    if (pendingProjectId) {
      setBackgroundError(false);
      setProjectId(pendingProjectId);
    } else if (pendingPlanId) {
      setBackgroundError(false);
      setFocusedParentId(null);
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
      <PageHeader
        title="Zone Configuration"
        subtitle="Assign each project WBS zone to its physical area on the Site Plan"
      />
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
              <Box sx={{ height: { xs: 380, md: 560 }, borderRadius: 2, overflow: "hidden", position: "relative" }}>
                <SitePlanCanvas
                  backgroundUrl={backgroundUrl}
                  mapW={mapW}
                  mapH={mapH}
                  areas={editAreas}
                  selectedKey={editor.selected?.key ?? null}
                  editMode={!saving}
                  vertexHandles={
                    editor.selected && !editor.drawing
                      ? {
                          areaKey: editor.selected.key,
                          points: editor.selected.points,
                          radius: 6 / viewport.view.scale,
                          hitStrokeWidth: 20 / viewport.view.scale,
                        }
                      : null
                  }
                  rotateHandle={rotateHandle}
                  resizeHandles={resizeHandles}
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
                    } else if (!saving) {
                      // Empty-space click resets: exit add-point mode and deselect.
                      // Clicking empty space again with nothing selected goes
                      // back to the All Zones overview.
                      setAddPointMode(false);
                      if (editor.selectedZoneId) {
                        editor.selectZone(null);
                      } else if (focusedParentId) {
                        setFocusedParentId(null);
                        fitAll();
                      }
                    }
                  }}
                  onStageDrag={viewport.onStageDrag}
                  onAreaClick={(key) => {
                    if (saving) return;
                    const area = areaDrafts.find((draft) => draft.key === key);
                    const action = getConfigMapClickAction({
                      drawing: Boolean(editor.drawing),
                      addPointMode,
                      boundaryEditing: editor.boundaryEditing,
                      selectedZoneId: editor.selectedZoneId,
                      clickedZoneId: area?.zone.id ?? null,
                    });
                    if (action.type === "add-drawing-point") {
                      const pt = viewport.screenToMap();
                      if (pt) editor.pushDrawPoint(clampToMap(pt, mapW, mapH));
                    } else if (action.type === "add-vertex" && editor.selected) {
                      const pt = viewport.screenToMap();
                      if (pt) editor.addVertexAt(editor.selected.key, pt);
                    } else if (action.type === "select-zone") {
                      selectZone(action.zoneId);
                    }
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
                  onShapeDragStart={() => setVertexDragging(true)}
                  onShapeDragEnd={(key, dx, dy) => {
                    setVertexDragging(false);
                    if (dx === 0 && dy === 0) return;
                    const d = editor.drafts.find((x) => x.key === key);
                    if (d) {
                      editor.updatePoints(key, translatePointsWithinMap(d.points, dx, dy, mapW, mapH));
                    }
                  }}
                  onRotateDragMove={(key, pt) => {
                    const selected = editor.selected;
                    if (!selected || selected.key !== key || selected.points.length === 0) return;
                    const center = polygonCenter(selected.points);
                    const start = rotateStartRef.current;
                    if (!start || start.key !== key) {
                      rotateStartRef.current = {
                        key,
                        startAngle: Math.atan2(pt.y - center.y, pt.x - center.x),
                        origPoints: selected.points,
                        center,
                      };
                      return;
                    }
                    const delta = Math.atan2(pt.y - center.y, pt.x - center.x) - start.startAngle;
                    editor.updatePoints(
                      key,
                      rotatePoints(start.origPoints, start.center, delta).map((p) => clampToMap(p, mapW, mapH)),
                    );
                  }}
                  onRotateDragEnd={(key, pt) => {
                    const selected = editor.selected;
                    const start = rotateStartRef.current;
                    if (selected && selected.key === key && start && start.key === key) {
                      const center = polygonCenter(selected.points);
                      const delta = Math.atan2(pt.y - center.y, pt.x - center.x) - start.startAngle;
                      editor.updatePoints(
                        key,
                        rotatePoints(start.origPoints, start.center, delta).map((p) => clampToMap(p, mapW, mapH)),
                      );
                    }
                    rotateStartRef.current = null;
                    setVertexDragging(false);
                  }}
                  onVertexDown={() => {
                    rotateStartRef.current = null;
                    resizeStartRef.current = null;
                    setVertexDragging(true);
                  }}
                  onVertexUp={() => setVertexDragging(false)}
                  onVertexClick={(_, index) => editor.selectVertex(index)}
                  onResizeDragStart={(key, handleId) => {
                    const selected = editor.selected;
                    if (!selected || selected.key !== key) return;
                    resizeStartRef.current = {
                      key,
                      handleId,
                      origPoints: selected.points,
                      origBounds: polygonBounds(selected.points),
                    };
                  }}
                  onResizeDragMove={(key, handleId, pt) => {
                    let start = resizeStartRef.current;
                    if (!start || start.key !== key || start.handleId !== handleId) {
                      const selected = editor.selected;
                      if (!selected || selected.key !== key) return;
                      start = {
                        key,
                        handleId,
                        origPoints: selected.points,
                        origBounds: polygonBounds(selected.points),
                      };
                      resizeStartRef.current = start;
                    }
                    const { anchor, scaleX, scaleY } = resizeScales(start.origBounds, handleId, pt);
                    // Guard against collapsing/flipping past the anchor edge.
                    const minScaleX = 8 / Math.max(start.origBounds.w, 1e-6);
                    const minScaleY = 8 / Math.max(start.origBounds.h, 1e-6);
                    const sx = handleId === "n" || handleId === "s" ? 1 : Math.max(scaleX, minScaleX);
                    const sy = handleId === "e" || handleId === "w" ? 1 : Math.max(scaleY, minScaleY);
                    editor.updatePoints(
                      key,
                      scalePoints(start.origPoints, anchor, sx, sy).map((p) => clampToMap(p, mapW, mapH)),
                    );
                  }}
                  onResizeDragEnd={(key, handleId, pt) => {
                    const start = resizeStartRef.current;
                    if (start && start.key === key && start.handleId === handleId) {
                      const { anchor, scaleX, scaleY } = resizeScales(start.origBounds, handleId, pt);
                      const minScaleX = 8 / Math.max(start.origBounds.w, 1e-6);
                      const minScaleY = 8 / Math.max(start.origBounds.h, 1e-6);
                      const sx = handleId === "n" || handleId === "s" ? 1 : Math.max(scaleX, minScaleX);
                      const sy = handleId === "e" || handleId === "w" ? 1 : Math.max(scaleY, minScaleY);
                      editor.updatePoints(
                        key,
                        scalePoints(start.origPoints, anchor, sx, sy).map((p) => clampToMap(p, mapW, mapH)),
                      );
                    }
                    resizeStartRef.current = null;
                    setVertexDragging(false);
                  }}
                  onImageLoad={onImageLoad}
                  onImageError={onImageError}
                />
              </Box>
              {editor.drawing ? (
                <Paper
                  elevation={3}
                  sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 1,
                    p: 1.5,
                    maxWidth: "calc(100% - 24px)",
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="body2">Click around the physical area to define the boundary.</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={editor.cancelDrawing}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={editor.undoDrawPoint}
                        disabled={editor.drawing.points.length === 0 || saving}
                      >
                        Undo
                      </Button>
                      <Button
                        size="small"
                        onClick={() => editor.finishDrawing()}
                        disabled={editor.drawing.points.length < 3 || saving}
                      >
                        Finish Area
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ) : null}
              {editor.selected && !editor.drawing && toolbarPos ? (
                <SelectionToolbar
                  x={toolbarPos.x}
                  y={toolbarPos.y}
                  zoneCode={selectedZoneCode}
                  addPointMode={addPointMode}
                  canDeleteVertex={canDeleteVertex}
                  canDuplicate={Boolean(duplicateTarget)}
                  canReset={canResetSelection}
                  disabled={saving}
                  onToggleAddPoint={() => setAddPointMode((mode) => !mode)}
                  onDeleteVertex={handleDeleteVertex}
                  onDuplicate={handleDuplicateSelection}
                  onReset={handleResetSelection}
                  onRemove={handleRemoveSelection}
                  onClose={handleDeselect}
                  colorValue={selectedColorHex}
                  colorsDisabled={saving}
                  onColorChange={(hex) => {
                    if (editor.selectedZoneId) changeZoneColor(editor.selectedZoneId, hex);
                  }}
                />
              ) : null}
              <SitePlanViewportControls
                viewport={viewport}
                onFitSelected={editor.selectedZoneId ? () => focusZone(editor.selectedZoneId as string) : undefined}
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
                zonesLoading={zonesQuery.isLoading}
                mappedZoneIds={mappedZoneIds}
                colorDrafts={zoneColorDrafts}
                saving={saving}
                saveError={saveMutation.error instanceof Error ? saveMutation.error.message : null}
                onZoneSelect={selectZone}
                onShowAllZones={() => {
                  setAddPointMode(false);
                  editor.selectZone(null);
                  setFocusedParentId(null);
                  fitAll();
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {configDirty && !editor.drawing ? (
        <Paper
          elevation={4}
          sx={{
            position: "sticky",
            bottom: 8,
            zIndex: 2,
            mt: 2,
            p: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack spacing={0.25}>
              <Typography variant="subtitle2">Unsaved changes</Typography>
              {hasInvalidZoneColor ? (
                <Typography variant="caption" color="error">
                  Enter a valid #RRGGBB zone color before saving.
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="inherit" onClick={() => setConfirmCancel(true)} disabled={saving}>
                Discard
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={saving || hasInvalidZoneColor || Boolean(editor.drawing)}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

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
