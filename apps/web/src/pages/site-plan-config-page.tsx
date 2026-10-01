import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { MapEditorPanel } from "@/features/site-plan/components/map-editor-panel.js";
import { SitePlanCanvas, type CanvasArea } from "@/features/site-plan/components/site-plan-canvas.js";
import {
  useCreateMapArea,
  useCanEditSitePlan,
  useDeleteMapArea,
  usePatchMapArea,
  useResetMapArea,
  useSaveMapAreas,
} from "@/features/site-plan/hooks/use-map-area-mutations.js";
import { useSitePlanEditor } from "@/features/site-plan/hooks/use-site-plan-editor.js";
import { useSitePlanViewport } from "@/features/site-plan/hooks/use-site-plan-viewport.js";
import { usePlanZones, useSitePlan } from "@/features/site-plan/hooks/use-site-plan.js";
import type { PolygonGeometry } from "@/features/site-plan/types/site-plan.types.js";
import { clampToMap, normalizedToMap, SITE_MAP_H, SITE_MAP_W } from "@/features/site-plan/utils/coordinates.js";

// Admin screen: WBS map configuration. Separate from the operational
// Site Plan (contractor activity view) by design.
export function SitePlanConfigPage() {
  const { projectId } = useCurrentProject();
  const canEdit = useCanEditSitePlan();
  const mobile = useMediaQuery("(max-width:599px)");

  const [addPointMode, setAddPointMode] = useState(false);
  const [vertexDragging, setVertexDragging] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const planQuery = useSitePlan(projectId);
  const zonesQuery = usePlanZones(projectId);
  const viewport = useSitePlanViewport(SITE_MAP_W, SITE_MAP_H);

  const serverAreas = useMemo(
    () =>
      (planQuery.data?.data.areas ?? []).map((a) => ({
        id: a.id as string,
        zone: a.zone,
        geometry: a.geometry as PolygonGeometry,
        isCustom: (a as { isCustom?: boolean }).isCustom ?? false,
      })),
    [planQuery.data],
  );

  const editor = useSitePlanEditor(serverAreas, SITE_MAP_W, SITE_MAP_H);

  useEffect(() => {
    if (planQuery.data && !editor.editMode) editor.enterEdit();
    // Enter once per loaded plan; drafts own state afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planQuery.data]);

  const saveMutation = useSaveMapAreas(projectId);
  const createMutation = useCreateMapArea(projectId, planQuery.data?.data.id ?? null);
  const deleteMutation = useDeleteMapArea(projectId, planQuery.data?.data.id ?? null);
  const resetMutation = useResetMapArea(projectId, planQuery.data?.data.id ?? null);
  const patchMutation = usePatchMapArea(projectId, planQuery.data?.data.id ?? null);
  const saving = saveMutation.isPending || createMutation.isPending || patchMutation.isPending;

  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data]);
  const mappedZoneIds = useMemo(() => new Set(serverAreas.map((a) => a.zone.id)), [serverAreas]);
  const customAreaIds = useMemo(
    () => new Set(serverAreas.filter((a) => a.isCustom).map((a) => a.id)),
    [serverAreas],
  );

  const editAreas: CanvasArea[] = useMemo(
    () =>
      editor.drafts.map((d) => {
        const zone = zones.find((z) => z.id === d.zoneId);
        return {
          key: d.key,
          points: d.points,
          fill: "#E4E7EC",
          stroke: d.key === editor.selected?.key ? "#0B4D8B" : "#64748B",
          strokeWidth: d.key === editor.selected?.key ? 3 : 1.5,
          dash: d.isNew ? [10, 6] : undefined,
          fillOpacity: 0.25,
          code: zone?.code ?? "?",
        };
      }),
    [editor.drafts, editor.selected, zones],
  );

  const handleSave = useCallback(async () => {
    const drafts = editor.allDrafts.filter((d) => !d.deleted);
    const serverById = new Map(serverAreas.map((a) => [a.id, a]));
    const bulk: { zoneId: string; geometry: PolygonGeometry }[] = [];
    const reassigns: { areaId: string; zoneId: string }[] = [];
    const created = drafts.filter((d) => d.isNew);
    const norm = (pts: { x: number; y: number }[]) => ({
      type: "polygon" as const,
      points: pts.map((p) => ({
        x: Math.min(1, Math.max(0, Math.round((p.x / SITE_MAP_W) * 10000) / 10000)),
        y: Math.min(1, Math.max(0, Math.round((p.y / SITE_MAP_H) * 10000) / 10000)),
      })),
    });

    for (const d of drafts) {
      if (d.isNew) continue;
      const server = d.areaId ? serverById.get(d.areaId) : undefined;
      if (!server) continue;
      if (d.zoneId !== server.zone.id) reassigns.push({ areaId: d.areaId as string, zoneId: d.zoneId });
      const serverPts = server.geometry.points.map((p) => normalizedToMap(p, SITE_MAP_W, SITE_MAP_H));
      const same =
        d.points.length === serverPts.length &&
        d.points.every((p, i) => p.x === serverPts[i]?.x && p.y === serverPts[i]?.y);
      if (!same) bulk.push({ zoneId: d.zoneId, geometry: norm(d.points) });
    }

    for (const r of reassigns) {
      await patchMutation.mutateAsync({ areaId: r.areaId, zoneId: r.zoneId });
    }
    if (bulk.length > 0) await saveMutation.mutateAsync(bulk);
    for (const c of created) {
      await createMutation.mutateAsync({ zoneId: c.zoneId, geometry: norm(c.points) });
    }
    editor.cancelEdit();
    setAddPointMode(false);
  }, [editor, serverAreas, patchMutation, saveMutation, createMutation]);

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

  if (planQuery.isLoading) {
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

  const backgroundUrl = planQuery.data.data.background.url ?? "/site-plan/master-layout-map.png";

  return (
    <Box>
      <PageHeader title="Zone Configuration" subtitle="Admin: define which polygon represents each WBS zone" />
      {mobile ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Map configuration is available on tablet or desktop. The operational Site Plan works on mobile.
        </Alert>
      ) : null}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ height: { xs: 380, md: 560 }, borderRadius: 2, overflow: "hidden" }}>
                <SitePlanCanvas
                  backgroundUrl={backgroundUrl}
                  mapW={SITE_MAP_W}
                  mapH={SITE_MAP_H}
                  areas={editAreas}
                  selectedKey={editor.selected?.key ?? null}
                  editMode
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
                  stageDraggable={!editor.drawing && !vertexDragging}
                  viewport={viewport.view}
                  containerRef={viewport.containerRef}
                  stageRef={viewport.stageRef}
                  size={viewport.size}
                  onWheelNative={(e) => viewport.onWheelNative(e)}
                  onStageClick={() => {
                    if (editor.drawing) {
                      const pt = viewport.screenToMap();
                      if (pt) editor.pushDrawPoint(clampToMap(pt, SITE_MAP_W, SITE_MAP_H));
                    }
                  }}
                  onAreaClick={(key) => {
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
                        d.points.map((p, i) => (i === index ? clampToMap(pt, SITE_MAP_W, SITE_MAP_H) : p)),
                      );
                    }
                  }}
                  onVertexDown={() => setVertexDragging(true)}
                  onVertexUp={() => setVertexDragging(false)}
                  onVertexClick={(_, index) => editor.selectVertex(index)}
                  onImageLoad={() => viewport.fitAll()}
                />
              </Box>
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
                onSave={() => void handleSave()}
                saving={saving}
                onCancel={() => {
                  if (editor.dirty) setConfirmCancel(true);
                  else editor.cancelEdit();
                }}
                addPointMode={addPointMode}
                onAddPointModeChange={setAddPointMode}
                onDeleteArea={(areaId) => {
                  deleteMutation.mutate(areaId, {
                    onSuccess: () => editor.removeDraft(editor.selected?.key ?? areaId),
                  });
                }}
                deleting={deleteMutation.isPending}
                onResetArea={(areaId) => {
                  resetMutation.mutate(areaId, {
                    onSuccess: (data) => {
                      const geom = (data as { data?: { geometry?: PolygonGeometry } })?.data?.geometry;
                      const key = editor.selected?.key;
                      if (key && geom) {
                        editor.applyServerGeometry(
                          key,
                          geom.points.map((p) => ({ x: p.x * SITE_MAP_W, y: p.y * SITE_MAP_H })),
                        );
                      }
                    },
                  });
                }}
                resetting={resetMutation.isPending}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Your map edits will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setConfirmCancel(false)}>
            Keep editing
          </Button>
          <Button
            color="error"
            onClick={() => {
              setConfirmCancel(false);
              editor.cancelEdit();
              setAddPointMode(false);
            }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
