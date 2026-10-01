import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink, useBlocker } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCanManageSiteConfiguration } from "@/features/auth/hooks/use-site-configuration-permission.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { siteOperationsApi as api } from "@/features/site-plan/api/site-operations.api.js";
import {
  siteOperationKeys,
  useFacilities,
  useFacilityMarkers,
  useFacilityParts,
  useFacilityPlacements,
  useMapViews,
  useSiteMaps,
} from "@/features/site-plan/hooks/use-site-operations.js";
import {
  defaultMapView,
  defaultSiteMap,
  markerDraftRows,
  updateMarkerDraft,
} from "@/features/site-plan/utils/facility-map-state.js";
import { mapToNormalized, normalizedToMap } from "@/features/site-plan/utils/coordinates.js";
import { SitePlanCanvas, type CanvasMarker } from "@/features/site-plan/components/site-plan-canvas.js";
import { SitePlanViewportControls } from "@/features/site-plan/components/site-plan-viewport-controls.js";
import { useSitePlanViewport } from "@/features/site-plan/hooks/use-site-plan-viewport.js";
import { SiteResourceDialog, type SiteResourceEditor } from "@/features/site-plan/components/site-resource-dialog.js";
import type { ActiveFilter, MarkerDrafts } from "@/features/site-plan/types/site-operations.types.js";

export function SiteConfigurationPage() {
  const theme = useTheme();
  const { projectId, setProjectId, registerProjectChangeGuard } = useCurrentProject();
  const canManage = useCanManageSiteConfiguration();
  const client = useQueryClient();
  const [tab, setTab] = useState("maps"),
    [facilityTab, setFacilityTab] = useState("markers");
  const [mapSelection, setMapSelection] = useState<string | null>(null),
    [viewSelection, setViewSelection] = useState<string | null>(null),
    [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const mapsQuery = useSiteMaps(projectId, "all"),
    facilitiesQuery = useFacilities(projectId, "all");
  const maps = mapsQuery.data?.data ?? [],
    facilities = facilitiesQuery.data?.data ?? [];
  const mapId = maps.find((map) => map.id === mapSelection)?.id ?? defaultSiteMap(maps) ?? maps[0]?.id ?? null;
  const selectedMap = maps.find((map) => map.id === mapId);
  const viewsQuery = useMapViews(projectId, mapId, "all"),
    views = viewsQuery.data?.data ?? [];
  const viewId = views.find((view) => view.id === viewSelection)?.id ?? defaultMapView(views) ?? views[0]?.id ?? null;
  const view = views.find((row) => row.id === viewId);
  const markersQuery = useFacilityMarkers(projectId, viewId, true);
  const savedMarkers = useMemo(() => markersQuery.data?.data ?? [], [markersQuery.data]);
  const selectedFacility = facilities.find((row) => row.id === selectedFacilityId);
  const partsQuery = useFacilityParts(projectId, selectedFacilityId, "all");
  const placementsQuery = useFacilityPlacements(projectId, selectedFacilityId);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<MarkerDrafts>({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<SiteResourceEditor | null>(null),
    [pickExisting, setPickExisting] = useState(false);
  const [archive, setArchive] = useState<{
    kind: "map" | "view" | "facility" | "part";
    id: string;
    name: string;
  } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false),
    [imageFailed, setImageFailed] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const dirty = Object.keys(drafts).length > 0;
  const blocker = useBlocker(dirty);
  const viewport = useSitePlanViewport(view?.width ?? 1, view?.height ?? 1);
  const { fitAll } = viewport;
  const requestChange = useCallback(
    (action: () => void) => {
      if (dirty) {
        pending.current = action;
        setConfirmDiscard(true);
      } else action();
    },
    [dirty],
  );
  useEffect(
    () => registerProjectChangeGuard((id) => requestChange(() => setProjectId(id))),
    [registerProjectChangeGuard, requestChange, setProjectId],
  );
  useEffect(() => {
    setMapSelection(null);
    setViewSelection(null);
    setSelectedFacilityId(null);
    setDrafts({});
    setError(null);
  }, [projectId]);
  useEffect(() => {
    setImageFailed(false);
    fitAll();
  }, [viewId, view?.width, view?.height, fitAll]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const refresh = async () => {
    if (projectId) await client.invalidateQueries({ queryKey: siteOperationKeys.project(projectId) });
  };
  const snapshot = useMemo(() => {
    const points = new Map(savedMarkers.map((marker) => [marker.facilityId, { x: marker.x, y: marker.y }]));
    for (const [id, point] of Object.entries(drafts)) {
      if (point) points.set(id, point);
      else points.delete(id);
    }
    return points;
  }, [savedMarkers, drafts]);
  const canvasMarkers: CanvasMarker[] = [...snapshot].flatMap(([id, point]) => {
    const facility =
      facilities.find((row) => row.id === id) ?? savedMarkers.find((row) => row.facilityId === id)?.facility;
    return facility
      ? [
          {
            key: id,
            ...normalizedToMap(point, view?.width ?? 1, view?.height ?? 1),
            label: facility.name,
            selected: selectedFacilityId === id,
            draft: Object.hasOwn(drafts, id),
            draggable: id === selectedFacilityId && facility.isActive && !saving,
            statusColor: id === selectedFacilityId ? theme.palette.primary.main : theme.palette.text.disabled,
          },
        ]
      : [];
  });
  const setPoint = (id: string, point: { x: number; y: number } | null) =>
    setDrafts((previous) => updateMarkerDraft(previous, savedMarkers, id, point));
  const saveMarkers = async () => {
    if (!viewId) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveMarkers(viewId, markerDraftRows(drafts));
      setDrafts({});
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Markers could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const onResourceSaved = async (kind: SiteResourceEditor["kind"], id: string) => {
    await refresh();
    if (kind === "map") {
      setMapSelection(id);
      setViewSelection(null);
      setTab("maps");
    }
    if (kind === "view") setViewSelection(id);
    if (kind === "facility") setSelectedFacilityId(id);
  };
  const doArchive = async () => {
    if (!archive) return;
    setSaving(true);
    setError(null);
    try {
      if (archive.kind === "map") await api.archiveMap(archive.id);
      if (archive.kind === "view") await api.archiveView(archive.id);
      if (archive.kind === "facility") await api.archiveFacility(archive.id);
      if (archive.kind === "part") await api.archivePart(archive.id);
      await refresh();
      setArchive(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Item could not be archived.");
    } finally {
      setSaving(false);
    }
  };
  const visibleFacilities = facilities.filter(
    (facility) =>
      (status === "all" || facility.isActive === (status === "active")) &&
      `${facility.name} ${facility.code ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (!canManage) return <Alert severity="warning">Site Configuration management permission is required.</Alert>;
  if (!projectId)
    return (
      <Box>
        <PageHeader title="Site Configuration" />
        <Alert severity="info">
          Create a Project before configuring its Maps and Facilities.{" "}
          <Button component={RouterLink} to="/projects">
            Create Project
          </Button>
        </Alert>
      </Box>
    );
  return (
    <Box>
      <PageHeader
        title="Site Configuration"
        subtitle="Maps show where Facilities are. Work Parts define smaller work areas."
      />
      <Tabs value={tab} onChange={(_, value: string) => requestChange(() => setTab(value))} sx={{ mb: 2 }}>
        <Tab value="maps" label="Maps" />
        <Tab value="facilities" label="Facilities" />
      </Tabs>
      {mapsQuery.isLoading || facilitiesQuery.isLoading ? <LinearProgress /> : null}
      {mapsQuery.isError || facilitiesQuery.isError ? (
        <Alert severity="error">
          Site information could not be loaded. <Button onClick={() => void refresh()}>Retry</Button>
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "250px minmax(0,1fr)" }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          {tab === "maps" ? (
            <Stack spacing={1}>
              <Typography variant="subtitle1">Site Maps</Typography>
              {maps.map((map) => (
                <Button
                  key={map.id}
                  color="inherit"
                  variant={map.id === mapId ? "outlined" : "text"}
                  sx={{ justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() =>
                    requestChange(() => {
                      setMapSelection(map.id);
                      setViewSelection(null);
                    })
                  }
                >
                  {map.isDefault ? "★ " : ""}
                  {map.name}
                  {!map.isActive ? " (Inactive)" : ""}
                </Button>
              ))}
              <Button
                variant="contained"
                disabled={dirty}
                onClick={() => setEditor({ kind: "map", initial: { isDefault: maps.length === 0 } })}
              >
                Add Map
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <TextField
                size="small"
                label="Search Facilities"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <TextField
                select
                size="small"
                label="Show"
                value={status}
                onChange={(event) => setStatus(event.target.value as ActiveFilter)}
              >
                <MenuItem value="all">All Facilities</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
              {visibleFacilities.map((facility) => (
                <Button
                  key={facility.id}
                  color="inherit"
                  variant={facility.id === selectedFacilityId ? "outlined" : "text"}
                  sx={{ justifyContent: "flex-start" }}
                  onClick={() => setSelectedFacilityId(facility.id)}
                >
                  {facility.name}
                  {!facility.isActive ? " (Inactive)" : ""}
                </Button>
              ))}
              <Button variant="contained" onClick={() => setEditor({ kind: "facility" })}>
                Add Facility
              </Button>
            </Stack>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
          {tab === "maps" ? (
            selectedMap ? (
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="h6">{selectedMap.name}</Typography>
                  <Stack direction="row">
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      disabled={dirty}
                      onClick={() => setEditor({ kind: "map", id: selectedMap.id, initial: selectedMap })}
                    >
                      Edit Map
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={dirty}
                      onClick={() => setArchive({ kind: "map", id: selectedMap.id, name: selectedMap.name })}
                    >
                      Archive Map
                    </Button>
                  </Stack>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {views.map((row) => (
                    <Button
                      key={row.id}
                      variant={row.id === viewId ? "contained" : "outlined"}
                      onClick={() => requestChange(() => setViewSelection(row.id))}
                    >
                      {row.name}
                      {!row.isActive ? " (Inactive)" : ""}
                    </Button>
                  ))}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    disabled={dirty}
                    onClick={() =>
                      setEditor({
                        kind: "view",
                        parentId: mapId!,
                        initial: { name: views.length === 0 ? "Overview" : "" },
                      })
                    }
                  >
                    Add View
                  </Button>
                </Stack>
                {viewsQuery.isError ? (
                  <Alert severity="error">
                    Views could not be loaded. <Button onClick={() => void viewsQuery.refetch()}>Retry</Button>
                  </Alert>
                ) : null}
                {view ? (
                  <>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={dirty}
                        onClick={() => setEditor({ kind: "view", id: view.id, parentId: mapId!, initial: view })}
                      >
                        Edit View / Image
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={dirty}
                        onClick={() => setArchive({ kind: "view", id: view.id, name: view.name })}
                      >
                        Archive View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        disabled={dirty}
                        onClick={() => setPickExisting(true)}
                      >
                        Use Existing Facility
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={dirty}
                        onClick={() => setEditor({ kind: "facility" })}
                      >
                        Add Facility
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                      {savedMarkers.map((marker) => (
                        <Button
                          key={marker.facilityId}
                          size="small"
                          variant={marker.facilityId === selectedFacilityId ? "outlined" : "text"}
                          onClick={() => setSelectedFacilityId(marker.facilityId)}
                        >
                          ✓ {marker.facility.name}
                        </Button>
                      ))}
                    </Stack>
                    {selectedFacility ? (
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                        <Typography variant="subtitle2">{selectedFacility.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {snapshot.has(selectedFacility.id)
                            ? "Click image or drag to move marker."
                            : "Not placed on this View. Click image to place marker."}
                        </Typography>
                        {snapshot.has(selectedFacility.id) ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={saving}
                            onClick={() => setPoint(selectedFacility.id, null)}
                          >
                            Remove Marker
                          </Button>
                        ) : null}
                        <Button
                          disabled={dirty}
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => {
                            setTab("facilities");
                            setFacilityTab("parts");
                          }}
                        >
                          Work Parts
                        </Button>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary" variant="body2">
                        Choose an existing Facility or add one, then place its marker.
                      </Typography>
                    )}
                    {markersQuery.isError ? <Alert severity="error">Markers could not be loaded.</Alert> : null}
                    {view.imageUrl && view.width && view.height ? (
                      <Box sx={{ position: "relative", height: { xs: 400, lg: 580 }, overflow: "hidden" }}>
                        <SitePlanCanvas
                          key={view.id}
                          backgroundUrl={view.imageUrl}
                          mapW={view.width}
                          mapH={view.height}
                          markers={canvasMarkers}
                          showLabels={false}
                          stageDraggable={!saving}
                          viewport={viewport.view}
                          containerRef={viewport.containerRef}
                          stageRef={viewport.stageRef}
                          size={viewport.size}
                          onStageDrag={viewport.onStageDrag}
                          onMarkerClick={setSelectedFacilityId}
                          onMarkerDragEnd={(id, point) =>
                            setPoint(id, mapToNormalized(point, view.width!, view.height!))
                          }
                          onStageClick={() => {
                            if (!selectedFacility?.isActive || saving) return;
                            const point = viewport.screenToMap();
                            if (point) setPoint(selectedFacility.id, mapToNormalized(point, view.width!, view.height!));
                          }}
                          onImageLoad={() => setImageFailed(false)}
                          onImageError={() => setImageFailed(true)}
                        />
                        <SitePlanViewportControls viewport={viewport} compact />
                        {imageFailed ? (
                          <Alert severity="error" sx={{ position: "absolute", top: 12, left: 12 }}>
                            Image could not be loaded. Use Edit View / Image to upload a replacement.
                          </Alert>
                        ) : null}
                      </Box>
                    ) : (
                      <Alert severity="info">
                        Upload an image for this View.{" "}
                        <Button
                          onClick={() => setEditor({ kind: "view", id: view.id, parentId: mapId!, initial: view })}
                        >
                          Upload image
                        </Button>
                      </Alert>
                    )}
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button disabled={!dirty || saving} onClick={() => setDrafts({})}>
                        Discard marker changes
                      </Button>
                      <Button
                        disabled={!dirty || saving || markersQuery.isError}
                        variant="contained"
                        onClick={() => void saveMarkers()}
                      >
                        {saving ? "Saving…" : "Save Markers"}
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Alert severity="info">Add the first View and upload a site image.</Alert>
                )}
              </Stack>
            ) : (
              <Alert severity="info">
                Create a Map to add image Views. Facilities can also be created independently in the Facilities section.
              </Alert>
            )
          ) : selectedFacility ? (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between">
                <Box>
                  <Typography variant="h6">{selectedFacility.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {selectedFacility.code}
                    {!selectedFacility.isActive ? " · Inactive" : ""}
                  </Typography>
                </Box>
                <Stack direction="row">
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => setEditor({ kind: "facility", id: selectedFacility.id, initial: selectedFacility })}
                  >
                    Edit Facility
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      setArchive({ kind: "facility", id: selectedFacility.id, name: selectedFacility.name })
                    }
                  >
                    Archive
                  </Button>
                </Stack>
              </Stack>
              <Tabs value={facilityTab} onChange={(_, value: string) => setFacilityTab(value)}>
                <Tab value="markers" label="Markers" />
                <Tab value="parts" label="Work Parts" />
              </Tabs>
              {facilityTab === "markers" ? (
                <Stack spacing={1}>
                  {placementsQuery.isLoading ? <LinearProgress /> : null}
                  {placementsQuery.isError ? <Alert severity="error">Placements could not be loaded.</Alert> : null}
                  {placementsQuery.data?.data.map((placement) => (
                    <Stack
                      key={placement.siteMapViewId}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">
                        {placement.mapName} / {placement.viewName} — {placement.markerId ? "Placed" : "Not placed"}
                        {!placement.isActive ? " (Inactive)" : ""}
                      </Typography>
                      <Button
                        onClick={() => {
                          setMapSelection(placement.siteMapId);
                          setViewSelection(placement.siteMapViewId);
                          setTab("maps");
                        }}
                      >
                        Place / Move
                      </Button>
                    </Stack>
                  ))}
                  {placementsQuery.data?.data.length === 0 ? (
                    <Typography color="text.secondary">Add a Map and View to place this Facility.</Typography>
                  ) : null}
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {partsQuery.isLoading ? <LinearProgress /> : null}
                  {partsQuery.isError ? <Alert severity="error">Work Parts could not be loaded.</Alert> : null}
                  {partsQuery.data?.data.map((part) => (
                    <Stack key={part.id} direction="row" alignItems="center" justifyContent="space-between">
                      <Typography>
                        {part.code} — {part.name}
                        {!part.isActive ? " (Inactive)" : ""}
                      </Typography>
                      <Stack direction="row">
                        <Button
                          onClick={() =>
                            setEditor({ kind: "part", id: part.id, parentId: selectedFacility.id, initial: part })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          color="error"
                          onClick={() => setArchive({ kind: "part", id: part.id, name: part.name })}
                        >
                          Archive
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                  {partsQuery.data?.data.length === 0 ? (
                    <Typography color="text.secondary">
                      No Work Parts yet. Use Work Parts when this Facility needs smaller operational work areas.
                    </Typography>
                  ) : null}
                  <Button
                    variant="outlined"
                    disabled={!selectedFacility.isActive}
                    onClick={() => setEditor({ kind: "part", parentId: selectedFacility.id })}
                  >
                    Add Work Part
                  </Button>
                </Stack>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Select a Facility to manage its markers and optional Work Parts.
            </Typography>
          )}
        </Paper>
      </Box>
      {editor ? (
        <SiteResourceDialog
          key={`${editor.kind}:${editor.id ?? "new"}:${editor.parentId ?? ""}`}
          editor={editor}
          projectId={projectId}
          onClose={() => setEditor(null)}
          onSaved={onResourceSaved}
        />
      ) : null}
      <Dialog open={pickExisting} onClose={() => setPickExisting(false)} fullWidth maxWidth="sm">
        <DialogTitle>Use Existing Facility</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={facilities.filter((row) => row.isActive)}
            getOptionLabel={(row) => row.name}
            onChange={(_, facility) => {
              if (facility) {
                setSelectedFacilityId(facility.id);
                setPickExisting(false);
              }
            }}
            renderInput={(params) => <TextField {...params} label="Existing Facility" sx={{ mt: 1 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setPickExisting(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!archive} onClose={() => !saving && setArchive(null)}>
        <DialogTitle>Archive {archive?.name}?</DialogTitle>
        <DialogContent>Existing Activity history will remain available.</DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" disabled={saving} onClick={() => setArchive(null)}>
            Cancel
          </Button>
          <Button disabled={saving} color="error" onClick={() => void doArchive()}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDiscard || blocker.state === "blocked"}
        onClose={() => {
          setConfirmDiscard(false);
          pending.current = null;
          if (blocker.state === "blocked") blocker.reset();
        }}
      >
        <DialogTitle>Discard marker changes?</DialogTitle>
        <DialogContent>Save changes before leaving this View, or discard the current drafts.</DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmDiscard(false);
              pending.current = null;
              if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Keep editing
          </Button>
          <Button
            color="error"
            onClick={() => {
              setDrafts({});
              setConfirmDiscard(false);
              const action = pending.current;
              pending.current = null;
              if (blocker.state === "blocked") blocker.proceed();
              else action?.();
            }}
          >
            Discard changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
