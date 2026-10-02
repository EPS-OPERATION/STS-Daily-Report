import { useCallback, useEffect, useMemo, useState } from "react";
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
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowDropDownOutlinedIcon from "@mui/icons-material/ArrowDropDownOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedOutlinedIcon from "@mui/icons-material/RadioButtonUncheckedOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";
import { PageHeader } from "@/components/shared/page-header.js";
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb.js";
import { EmptyState } from "@/components/shared/empty-state.js";
import { StatusChip } from "@/components/shared/status-chip.js";
import { useCanManageSiteConfiguration } from "@/features/auth/hooks/use-site-configuration-permission.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { siteOperationsApi as api } from "@/services/site-operations.api.js";
import {
  useFacilities,
  useFacilityMarkers,
  useFacilityParts,
  useFacilityPlacements,
  useMapViews,
  useSiteMaps,
} from "@/hooks/use-site-operations.js";
import { siteOperationKeys as keys } from "@/consts/query-keys/site-operations.js";
import {
  defaultMapView,
  defaultSiteMap,
  markerDraftRows,
  updateMarkerDraft,
} from "@/features/site-maps/helpers/facility-map-state.js";
import { mapToNormalized, normalizedToMap, pointsBounds } from "@/features/site-maps/helpers/coordinates.js";
import { SitePlanCanvas, type CanvasMarker } from "@/features/site-maps/components/site-plan-canvas.js";
import { SitePlanViewportControls } from "@/features/site-maps/components/site-plan-viewport-controls.js";
import { useSitePlanViewport } from "@/features/site-maps/hooks/use-site-plan-viewport.js";
import { SiteResourceDialog, type SiteResourceEditor } from "../components/site-resource-dialog.js";
import { FacilityPlacementPanel } from "../components/facility-placement-panel.js";
import { appendDisplayOrder, markerPoints, placementFacility } from "../helpers/editor-state.js";
import type { ActiveFilter, MarkerDrafts } from "@/types/site-operations.types.js";

type ResourceKind = SiteResourceEditor["kind"];
type ArchiveTarget = { kind: ResourceKind; id: string; name: string };

export function SiteConfigurationPage() {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const { projectId, setProjectId, registerProjectChangeGuard, projects } = useCurrentProject();
  const projectName = projects.find((project) => project.id === projectId)?.name ?? "Project";
  const canManage = useCanManageSiteConfiguration();
  const client = useQueryClient();
  const [section, setSection] = useState("maps"),
    [facilityTab, setFacilityTab] = useState("markers");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [placementFacilityId, setPlacementFacilityId] = useState<string | null>(null);
  const [markerDrafts, setMarkerDrafts] = useState<MarkerDrafts>({});
  const [search, setSearch] = useState(""),
    [partSearch, setPartSearch] = useState(""),
    [status, setStatus] = useState<ActiveFilter>("all");
  const [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<SiteResourceEditor | null>(null);
  const [archive, setArchive] = useState<ArchiveTarget | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; kind: ResourceKind; id: string } | null>(null);
  const [mapMenuAnchor, setMapMenuAnchor] = useState<null | HTMLElement>(null);
  const [pendingChange, setPendingChange] = useState<{ action: () => void } | null>(null);
  const [facilityDrawerOpen, setFacilityDrawerOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false),
    [imageFailed, setImageFailed] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ viewId: string; facilityId: string } | null>(null);
  const isDirty = Object.keys(markerDrafts).length > 0;
  const dirtyCount = Object.keys(markerDrafts).length;
  const blocker = useBlocker(isDirty);
  const mapsQuery = useSiteMaps(projectId, "all"),
    facilitiesQuery = useFacilities(projectId, "all");
  const maps = mapsQuery.data?.data ?? [];
  const facilities = useMemo(() => facilitiesQuery.data?.data ?? [], [facilitiesQuery.data]);
  const mapId = maps.find((row) => row.id === selectedMapId)?.id ?? defaultSiteMap(maps) ?? maps[0]?.id ?? null;
  const map = maps.find((row) => row.id === mapId);
  const viewsQuery = useMapViews(projectId, mapId, "all"),
    views = viewsQuery.data?.data ?? [];
  const viewId = views.find((row) => row.id === selectedViewId)?.id ?? defaultMapView(views) ?? views[0]?.id ?? null;
  const view = views.find((row) => row.id === viewId);
  const markersQuery = useFacilityMarkers(projectId, viewId, true);
  const savedMarkers = useMemo(() => markersQuery.data?.data ?? [], [markersQuery.data]);
  const points = useMemo(() => markerPoints(savedMarkers, markerDrafts), [savedMarkers, markerDrafts]);
  const facility = facilities.find((row) => row.id === selectedFacilityId);
  const placing = facilities.find((row) => row.id === placementFacilityId);
  const partsQuery = useFacilityParts(projectId, selectedFacilityId, "all"),
    parts = partsQuery.data?.data ?? [];
  const placementsQuery = useFacilityPlacements(projectId, selectedFacilityId),
    placements = placementsQuery.data?.data ?? [];
  const viewport = useSitePlanViewport(view?.width ?? 1, view?.height ?? 1);
  const { fitAll, fitBounds } = viewport;
  const imageReady =
    !!view?.imageUrl &&
    !!view.width &&
    !!view.height &&
    imageLoaded &&
    !imageFailed &&
    !markersQuery.isLoading &&
    !markersQuery.isError;
  const requestChange = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingChange({ action });
      else action();
    },
    [isDirty],
  );
  useEffect(
    () => registerProjectChangeGuard((id) => requestChange(() => setProjectId(id))),
    [registerProjectChangeGuard, requestChange, setProjectId],
  );
  useEffect(() => {
    setSelectedMapId(null);
    setSelectedViewId(null);
    setSelectedFacilityId(null);
    setPlacementFacilityId(null);
    setMarkerDrafts({});
    setFocusRequest(null);
    setError(null);
  }, [projectId]);
  useEffect(() => {
    setPlacementFacilityId(null);
    fitAll();
  }, [viewId, view?.width, view?.height, fitAll]);
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [viewId, view?.imageUrl]);
  useEffect(() => {
    if (!isDirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isDirty]);
  useEffect(() => {
    if (!focusRequest || focusRequest.viewId !== viewId || !imageReady) return;
    const target = points.get(focusRequest.facilityId);
    if (target && !viewport.size.w) return;
    const selected = facilities.find((row) => row.id === focusRequest.facilityId);
    setPlacementFacilityId(placementFacility(focusRequest.facilityId, !!selected?.isActive, imageReady, points));
    if (target && view?.width && view.height)
      fitBounds(pointsBounds([normalizedToMap(target, view.width, view.height)]), view.width / 6);
    else fitAll();
    setFocusRequest(null);
  }, [
    focusRequest,
    viewId,
    imageReady,
    points,
    facilities,
    viewport.size.w,
    view?.width,
    view?.height,
    fitBounds,
    fitAll,
  ]);
  const invalidate = async (resource: string, id?: string) => {
    if (projectId)
      await client.invalidateQueries({ queryKey: [...keys.project(projectId), resource, ...(id ? [id] : [])] });
  };
  const selectMap = (id: string) =>
    requestChange(() => {
      setSelectedMapId(id);
      setSelectedViewId(null);
      setFocusRequest(null);
    });
  const selectView = (id: string) =>
    requestChange(() => {
      setSelectedViewId(id);
      setFocusRequest(null);
    });
  const pickFacility = (id: string) => {
    setSelectedFacilityId(id);
    const selected = facilities.find((row) => row.id === id);
    setPlacementFacilityId(placementFacility(id, !!selected?.isActive, imageReady, points));
    const point = points.get(id);
    if (point && view?.width && view.height)
      fitBounds(pointsBounds([normalizedToMap(point, view.width, view.height)]), view.width / 6);
    else fitAll();
    setFacilityDrawerOpen(false);
  };
  const setPoint = (id: string, point: { x: number; y: number } | null) => {
    if (saving) return;
    setMarkerDrafts((previous) => updateMarkerDraft(previous, savedMarkers, id, point));
  };
  const saveMarkers = async () => {
    if (!projectId || !viewId || markersQuery.isError) return false;
    setSaving(true);
    setError(null);
    try {
      const changed = Object.keys(markerDrafts);
      await api.saveMarkers(viewId, markerDraftRows(markerDrafts));
      await invalidate("markers", viewId);
      await Promise.all(changed.map((id) => client.invalidateQueries({ queryKey: keys.placements(projectId, id) })));
      setMarkerDrafts({});
      setNotice("Changes saved");
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Changes could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const finishLeave = () => {
    const next = pendingChange;
    setPendingChange(null);
    if (blocker.state === "blocked") blocker.proceed();
    else next?.action();
  };
  const stay = () => {
    setPendingChange(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  const discard = () => {
    setMarkerDrafts({});
    setPlacementFacilityId(null);
    setNotice("Unsaved changes discarded");
  };
  const onResourceSaved = async (kind: ResourceKind, id: string) => {
    if (kind === "map") {
      await invalidate("maps");
      await invalidate("placements");
      setSelectedMapId(id);
      setSelectedViewId(null);
      setSection("maps");
    }
    if (kind === "view") {
      await invalidate("views", mapId ?? undefined);
      await invalidate("placements");
      setSelectedViewId(id);
    }
    if (kind === "facility") {
      await invalidate("facilities");
      if (editor?.id) await invalidate("markers");
      setSelectedFacilityId(id);
      if (section === "maps" && !editor?.id && imageReady) {
        setPlacementFacilityId(id);
        fitAll();
      }
    }
    if (kind === "part") {
      await invalidate("parts", selectedFacilityId ?? undefined);
    }
    setNotice(
      editor?.imageOnly
        ? "View image uploaded"
        : `${kind === "part" ? "Work Part" : kind[0]!.toUpperCase() + kind.slice(1)} ${editor?.id ? "updated" : "created"}`,
    );
  };
  const openEditor = (kind: ResourceKind) => {
    const order =
      kind === "view"
        ? appendDisplayOrder(views)
        : kind === "facility"
          ? appendDisplayOrder(facilities)
          : appendDisplayOrder(parts);
    setEditor({
      kind,
      parentId:
        kind === "view" ? (mapId ?? undefined) : kind === "part" ? (selectedFacilityId ?? undefined) : undefined,
      initial: {
        sortOrder: order,
        isDefault: kind === "map" && maps.length === 0,
        name: kind === "view" && views.length === 0 ? "Overview" : "",
      },
    });
  };
  const doArchive = async () => {
    if (!archive) return;
    setSaving(true);
    setError(null);
    try {
      if (archive.kind === "map") {
        await api.archiveMap(archive.id);
        await invalidate("maps");
      }
      if (archive.kind === "view") {
        await api.archiveView(archive.id);
        await invalidate("views", mapId ?? undefined);
        await invalidate("placements");
      }
      if (archive.kind === "facility") {
        await api.archiveFacility(archive.id);
        await invalidate("facilities");
        await invalidate("markers");
        setPlacementFacilityId(null);
      }
      if (archive.kind === "part") {
        await api.archivePart(archive.id);
        await invalidate("parts", selectedFacilityId ?? undefined);
      }
      setNotice(`${archive.name} archived`);
      setArchive(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Item could not be archived.");
    } finally {
      setSaving(false);
    }
  };
  const setDefault = async () => {
    if (!projectId || !map) return;
    setSaving(true);
    try {
      await api.saveMap(projectId, map.id, { name: map.name, isDefault: true });
      await invalidate("maps");
      setNotice("Default Map updated");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Default Map could not be updated.");
    } finally {
      setSaving(false);
    }
  };
  const openPlacement = (targetViewId: string, targetMapId: string) =>
    requestChange(() => {
      setSection("maps");
      setSelectedMapId(targetMapId);
      setSelectedViewId(targetViewId);
      if (selectedFacilityId) setFocusRequest({ viewId: targetViewId, facilityId: selectedFacilityId });
    });
  const canvasMarkers: CanvasMarker[] = [...points].flatMap(([id, point]) => {
    const row =
      facilities.find((item) => item.id === id) ?? savedMarkers.find((item) => item.facilityId === id)?.facility;
    return row
      ? [
          {
            key: id,
            ...normalizedToMap(point, view?.width ?? 1, view?.height ?? 1),
            label: row.name,
            selected: id === selectedFacilityId,
            draft: Object.hasOwn(markerDrafts, id),
            draggable: id === selectedFacilityId && row.isActive && !saving,
            statusColor: id === selectedFacilityId ? theme.palette.primary.main : theme.palette.text.secondary,
          },
        ]
      : [];
  });
  const mapFacilities = facilities.filter((row) => row.isActive || points.has(row.id));
  const placementPanel = (
    <FacilityPlacementPanel
      facilities={mapFacilities}
      selectedId={selectedFacilityId}
      points={points}
      search={search}
      onSearch={setSearch}
      onSelect={pickFacility}
      onCreate={() => openEditor("facility")}
      loading={facilitiesQuery.isLoading || markersQuery.isLoading}
      failed={facilitiesQuery.isError}
      disabled={saving || !imageReady}
    />
  );
  const retry = (message: string, action: () => void) => (
    <Alert
      severity="error"
      action={
        <Button variant="text" onClick={action}>
          Retry
        </Button>
      }
    >
      {message}
    </Alert>
  );
  const overflow = (kind: ResourceKind, id: string, label: string, fixedSize = false) => (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        disabled={saving}
        onClick={(event) => setMenu({ anchor: event.currentTarget, kind, id })}
        sx={fixedSize ? { width: 40, height: 40 } : undefined}
      >
        <MoreVertOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
  const menuResource =
    menu?.kind === "map"
      ? maps.find((row) => row.id === menu.id)
      : menu?.kind === "view"
        ? views.find((row) => row.id === menu.id)
        : menu?.kind === "facility"
          ? facilities.find((row) => row.id === menu.id)
          : parts.find((row) => row.id === menu?.id);
  const editMenuResource = (imageOnly = false) => {
    if (menu && menuResource) {
      const current = menu;
      setMenu(null);
      requestChange(() =>
        setEditor({
          kind: current.kind,
          id: current.id,
          parentId: current.kind === "view" ? (mapId ?? undefined) : (selectedFacilityId ?? undefined),
          initial: menuResource,
          imageOnly,
        }),
      );
    }
  };
  if (!canManage) return <Alert severity="warning">Site Configuration management permission is required.</Alert>;
  if (!projectId)
    return (
      <Box>
        <PageHeader title="Site Configuration" />
        <EmptyState
          icon={<MapOutlinedIcon />}
          title="Start with a Project"
          description="Create a Project, then add its site images and Facilities."
          action={
            <Button component={RouterLink} to="/projects">
              Create Project
            </Button>
          }
        />
      </Box>
    );
  return (
    // Fill exactly the space below the app shell (64px topbar + 1px border +
    // 48px main padding) so sections flex internally instead of scrolling the screen.
    <Box
      sx={{
        height: { xs: "auto", md: "calc(100dvh - 113px)" },
        display: { xs: "block", md: "flex" },
        flexDirection: "column",
        overflow: { xs: "visible", md: "hidden" },
        minHeight: 0,
      }}
    >
      <Stack spacing={0} sx={{ flexShrink: 0, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          {section === "maps" ? (
            <MapOutlinedIcon fontSize="small" color="primary" />
          ) : (
            <BusinessOutlinedIcon fontSize="small" color="primary" />
          )}
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {section === "maps" ? (map?.name ?? "Site Maps") : (facility?.name ?? "Facilities")}
          </Typography>
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ flexWrap: "wrap", rowGap: 0.5 }}
        >
          <PageBreadcrumb
            items={[
              { label: projectName, to: "/projects" },
              { label: "Site Configuration" },
              { label: section === "maps" ? "Maps" : "Facilities" },
            ]}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            color="primary"
            value={section}
            onChange={(_, value: string | null) => value && requestChange(() => setSection(value))}
            aria-label="Configuration section"
            sx={{ height: 40, flexShrink: 0, "& .MuiToggleButton-root": { px: 2.5 } }}
          >
            <ToggleButton value="maps">Maps</ToggleButton>
            <ToggleButton value="facilities">Facilities</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {mapsQuery.isError ? retry("Site Maps could not be loaded.", () => void mapsQuery.refetch()) : null}
      {facilitiesQuery.isError ? retry("Facilities could not be loaded.", () => void facilitiesQuery.refetch()) : null}
      {section === "maps" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ flexShrink: 0, mb: 1, flexWrap: "wrap", rowGap: 1 }}
          >
            {map ? (
              <>
                <Button
                  variant="outlined"
                  onClick={(event) => setMapMenuAnchor(event.currentTarget)}
                  startIcon={map.isDefault ? <StarOutlinedIcon fontSize="small" /> : undefined}
                  endIcon={<ArrowDropDownOutlinedIcon fontSize="small" />}
                  aria-label="Select Site Map"
                  sx={{ height: 40, minWidth: 0, maxWidth: { xs: "100%", sm: 280 } }}
                >
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {map.name}
                  </Typography>
                </Button>
                <Menu anchorEl={mapMenuAnchor} open={!!mapMenuAnchor} onClose={() => setMapMenuAnchor(null)}>
                  {maps.map((row) => (
                    <MenuItem
                      key={row.id}
                      selected={row.id === mapId}
                      onClick={() => {
                        setMapMenuAnchor(null);
                        selectMap(row.id);
                      }}
                    >
                      {row.isDefault ? "★ " : ""}
                      {row.name}
                      {!row.isActive ? " (Archived)" : ""}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setMapMenuAnchor(null);
                      requestChange(() => openEditor("map"));
                    }}
                  >
                    <ListItemIcon>
                      <AddOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    Add Map
                  </MenuItem>
                </Menu>
                {overflow("map", map.id, "Map actions", true)}
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  View
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={viewId}
                  onChange={(_, id: string | null) => id && selectView(id)}
                  aria-label="Map Views"
                  sx={{ height: 40, flexShrink: 0, "& .MuiToggleButton-root": { px: 2.5 } }}
                >
                  {views.map((row) => (
                    <ToggleButton key={row.id} value={row.id}>
                      {row.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <Tooltip title="Add View">
                  <IconButton
                    aria-label="Add View"
                    onClick={() => requestChange(() => openEditor("view"))}
                    sx={{ width: 40, height: 40 }}
                  >
                    <AddOutlinedIcon />
                  </IconButton>
                </Tooltip>
                {view ? overflow("view", view.id, `${view.name} actions`, true) : null}
              </>
            ) : null}
          </Stack>
          {map && !wide ? (
            <Button
              variant="text"
              startIcon={<PlaceOutlinedIcon />}
              onClick={() => setFacilityDrawerOpen(true)}
              sx={{ m: 1 }}
            >
              Facilities · {mapFacilities.filter((row) => points.has(row.id)).length}/{mapFacilities.length} placed
            </Button>
          ) : null}
          <Paper variant="outlined" sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Box
              sx={{
                position: "relative",
                flex: "1 1 auto",
                minWidth: 0,
                minHeight: 0,
                bgcolor: "background.default",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {map ? (
                <>
                  {viewsQuery.isLoading ? (
                    <Skeleton variant="rectangular" height={420} />
                  ) : viewsQuery.isError ? (
                    retry("Views could not be loaded.", () => void viewsQuery.refetch())
                  ) : !view ? (
                    <Box sx={{ p: 2 }}>
                      <EmptyState
                        icon={<MapOutlinedIcon />}
                        title="No views yet"
                        description="Add an image view to start placing Facilities."
                        action={
                          <Button startIcon={<AddOutlinedIcon />} onClick={() => openEditor("view")}>
                            Add View
                          </Button>
                        }
                      />
                    </Box>
                  ) : view.imageUrl && view.width && view.height ? (
                    <Box
                      sx={{
                        position: "relative",
                        height: { xs: 420, md: "auto" },
                        flex: { xs: "none", md: "1 1 auto" },
                        minHeight: { xs: 360, md: 0 },
                        bgcolor: "background.default",
                      }}
                    >
                      <SitePlanCanvas
                        key={view.id}
                        backgroundUrl={view.imageUrl}
                        mapW={view.width}
                        mapH={view.height}
                        markers={canvasMarkers}
                        showLabels={false}
                        cursor={placementFacilityId ? "crosshair" : "grab"}
                        stageDraggable={!saving}
                        viewport={viewport.view}
                        containerRef={viewport.containerRef}
                        stageRef={viewport.stageRef}
                        size={viewport.size}
                        onStageDrag={viewport.onStageDrag}
                        onMarkerClick={pickFacility}
                        onMarkerDragEnd={(id, point) => setPoint(id, mapToNormalized(point, view.width!, view.height!))}
                        onStageClick={() => {
                          if (!placing?.isActive || !imageReady || saving) return;
                          const point = viewport.screenToMap();
                          if (!point || point.x < 0 || point.y < 0 || point.x > view.width! || point.y > view.height!)
                            return;
                          setPoint(placing.id, mapToNormalized(point, view.width!, view.height!));
                          setPlacementFacilityId(null);
                          setNotice("Marker placed — save changes to apply.");
                        }}
                        onImageLoad={() => setImageLoaded(true)}
                        onImageError={() => {
                          setImageFailed(true);
                          setImageLoaded(false);
                        }}
                      />
                      <SitePlanViewportControls viewport={viewport} compact />
                      {placing ? (
                        <Paper
                          elevation={4}
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            pl: 1.5,
                            pr: 0.5,
                            py: 0.5,
                            borderRadius: 999,
                            maxWidth: "calc(100% - 24px)",
                            bgcolor: "info.main",
                            color: "info.contrastText",
                          }}
                        >
                          <PlaceOutlinedIcon fontSize="small" />
                          <Typography variant="body2" noWrap>
                            Placing {placing.name} — click on the image to place
                          </Typography>
                          <Button
                            variant="text"
                            size="small"
                            color="inherit"
                            onClick={() => setPlacementFacilityId(null)}
                            sx={{ flexShrink: 0, borderRadius: 999 }}
                          >
                            Cancel
                          </Button>
                        </Paper>
                      ) : facility && points.has(facility.id) ? (
                        <Paper
                          elevation={4}
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            pl: 2,
                            pr: 0.5,
                            py: 0.5,
                            borderRadius: 999,
                            maxWidth: "calc(100% - 24px)",
                          }}
                        >
                          <Typography variant="body2" noWrap>
                            {facility.name} · {facility.isActive ? "Drag the point to move it." : "Archived Facility."}
                          </Typography>
                          <Button
                            variant="text"
                            size="small"
                            color="error"
                            disabled={saving}
                            onClick={() => {
                              setPoint(facility.id, null);
                              setPlacementFacilityId(null);
                              setNotice("Placement removed — save changes to apply.");
                            }}
                            sx={{ flexShrink: 0, borderRadius: 999 }}
                          >
                            Remove
                          </Button>
                        </Paper>
                      ) : null}
                      {markersQuery.isLoading ? (
                        <LinearProgress
                          aria-label="Loading Facility placements"
                          sx={{ position: "absolute", top: 0, left: 0, right: 0 }}
                        />
                      ) : null}
                      {imageFailed ? (
                        <Alert
                          severity="error"
                          sx={{ position: "absolute", top: 12, left: 12, right: 12 }}
                          action={
                            <Button
                              variant="text"
                              onClick={() =>
                                setEditor({
                                  kind: "view",
                                  id: view.id,
                                  parentId: mapId!,
                                  initial: view,
                                  imageOnly: true,
                                })
                              }
                            >
                              Replace image
                            </Button>
                          }
                        >
                          This image could not be loaded.
                        </Alert>
                      ) : null}
                    </Box>
                  ) : (
                    <Box sx={{ p: 2 }}>
                      <EmptyState
                        icon={<MapOutlinedIcon />}
                        title="Add a site image"
                        description="Upload an image to start placing Facilities on this View."
                        action={
                          <Button
                            onClick={() =>
                              setEditor({ kind: "view", id: view.id, parentId: mapId!, initial: view, imageOnly: true })
                            }
                          >
                            Upload image
                          </Button>
                        }
                      />
                    </Box>
                  )}
                  {markersQuery.isError
                    ? retry("Facility placements could not be loaded.", () => void markersQuery.refetch())
                    : null}
                </>
              ) : mapsQuery.isLoading ? (
                <Skeleton variant="rectangular" height={450} />
              ) : (
                <Box sx={{ p: 2 }}>
                  <EmptyState
                    icon={<MapOutlinedIcon />}
                    title="Create your first Site Map"
                    description="A Site Map holds images of your site, such as an overview or a top view."
                    action={
                      <Button onClick={() => openEditor("map")} startIcon={<AddOutlinedIcon />}>
                        Add Map
                      </Button>
                    }
                  />
                </Box>
              )}
            </Box>
            {wide ? (
              <Box
                sx={{
                  width: 280,
                  flexShrink: 0,
                  minHeight: 0,
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  p: 1.5,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {placementPanel}
              </Box>
            ) : null}
          </Paper>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {!desktop ? (
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Autocomplete
                options={facilities.filter((row) => status === "all" || row.isActive === (status === "active"))}
                value={facility ?? null}
                getOptionLabel={(row) => row.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, row) => setSelectedFacilityId(row?.id ?? null)}
                renderInput={(params) => <TextField {...params} label="Choose a Facility" />}
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  label="Show"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ActiveFilter)}
                >
                  <MenuItem value="all">All Facilities</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Archived</MenuItem>
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<AddOutlinedIcon />}
                  onClick={() => openEditor("facility")}
                  sx={{ flexShrink: 0 }}
                >
                  Facility
                </Button>
              </Stack>
            </Stack>
          ) : null}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: desktop ? "260px minmax(0,1fr)" : "minmax(0,1fr)",
              gap: 2,
              alignItems: "stretch",
              flex: 1,
              minHeight: 0,
            }}
          >
            {desktop ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                <FacilityPlacementPanel
                  facilities={facilities}
                  selectedId={selectedFacilityId}
                  search={search}
                  onSearch={setSearch}
                  onSelect={setSelectedFacilityId}
                  onCreate={() => openEditor("facility")}
                  loading={facilitiesQuery.isLoading}
                  disabled={saving}
                  status={status}
                  onStatus={setStatus}
                />
              </Paper>
            ) : null}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minWidth: 0,
                minHeight: 0,
                height: "100%",
                overflowY: "auto",
              }}
            >
              {!facility ? (
                <EmptyState
                  icon={<BusinessOutlinedIcon />}
                  title="Select a Facility"
                  description="Manage map placements and Work Parts for each building or work location. Choose a Facility from the list."
                />
              ) : (
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="h5">{facility.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {facility.code ? `${facility.code} · ` : ""}
                        {facility.isActive ? "Operational work location" : "Archived Facility"}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setEditor({ kind: "facility", id: facility.id, initial: facility })}
                      >
                        Edit Facility
                      </Button>
                      {overflow("facility", facility.id, "Facility actions")}
                    </Stack>
                  </Stack>
                  <Tabs
                    value={facilityTab}
                    onChange={(_, value: string) => {
                      setFacilityTab(value);
                      setPartSearch("");
                    }}
                  >
                    <Tab value="markers" label="Markers" />
                    <Tab value="parts" label="Work Parts" />
                  </Tabs>
                  {facilityTab === "markers" ? (
                    <Stack spacing={1.5}>
                      <Typography variant="subtitle1">
                        Map placements · {placements.filter((row) => !!row.markerId).length} / {placements.length}
                      </Typography>
                      {placementsQuery.isLoading ? (
                        <Skeleton variant="rectangular" height={130} />
                      ) : placementsQuery.isError ? (
                        retry("Map placements could not be loaded.", () => void placementsQuery.refetch())
                      ) : placements.length ? (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(2,minmax(0,1fr))",
                              xl: "repeat(3,minmax(0,1fr))",
                            },
                            gap: 1.5,
                          }}
                        >
                          {placements.map((row) => (
                            <Paper key={row.siteMapViewId} variant="outlined" sx={{ p: 1.5 }}>
                              <Stack spacing={1}>
                                <Box>
                                  <Typography variant="subtitle2">{row.mapName}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {row.viewName}
                                    {!row.isActive ? " (Archived)" : ""}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                  {row.markerId ? (
                                    <CheckCircleOutlineIcon color="primary" fontSize="small" />
                                  ) : (
                                    <RadioButtonUncheckedOutlinedIcon color="disabled" fontSize="small" />
                                  )}
                                  <Typography variant="body2">{row.markerId ? "Placed" : "Not placed"}</Typography>
                                </Stack>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => openPlacement(row.siteMapViewId, row.siteMapId)}
                                >
                                  {row.markerId ? "Open on Map" : "Place Marker"}
                                </Button>
                              </Stack>
                            </Paper>
                          ))}
                        </Box>
                      ) : (
                        <EmptyState
                          icon={<MapOutlinedIcon />}
                          title="No Map Views yet"
                          description="Add a Map and image View to place this Facility."
                          action={
                            <Button variant="outlined" onClick={() => setSection("maps")}>
                              Go to Maps
                            </Button>
                          }
                        />
                      )}
                    </Stack>
                  ) : (
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">Work Parts · {parts.length}</Typography>
                        {parts.length ? (
                          <Button
                            size="small"
                            startIcon={<AddOutlinedIcon />}
                            disabled={!facility.isActive}
                            onClick={() => openEditor("part")}
                          >
                            Add Part
                          </Button>
                        ) : null}
                      </Stack>
                      {partsQuery.isLoading ? (
                        <Skeleton height={100} />
                      ) : partsQuery.isError ? (
                        retry("Work Parts could not be loaded.", () => void partsQuery.refetch())
                      ) : !parts.length ? (
                        <EmptyState
                          icon={<BusinessOutlinedIcon />}
                          title="No Work Parts yet"
                          description="Use Work Parts when this Facility needs smaller operational work areas."
                          action={
                            <Button
                              startIcon={<AddOutlinedIcon />}
                              disabled={!facility.isActive}
                              onClick={() => openEditor("part")}
                            >
                              Add first Part
                            </Button>
                          }
                        />
                      ) : (
                        <>
                          <TextField
                            label="Search Parts"
                            value={partSearch}
                            onChange={(event) => setPartSearch(event.target.value)}
                          />
                          {parts
                            .filter((row) => `${row.name} ${row.code}`.toLowerCase().includes(partSearch.toLowerCase()))
                            .map((part) => (
                              <Stack
                                key={part.id}
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2">{part.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {part.code}
                                  </Typography>
                                </Box>
                                <StatusChip
                                  status={part.isActive ? "active" : "idle"}
                                  label={part.isActive ? "Active" : "Inactive"}
                                />
                                <Tooltip title={`Edit ${part.name}`}>
                                  <IconButton
                                    size="small"
                                    aria-label={`Edit ${part.name}`}
                                    onClick={() =>
                                      setEditor({ kind: "part", id: part.id, parentId: facility.id, initial: part })
                                    }
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {overflow("part", part.id, `${part.name} actions`)}
                              </Stack>
                            ))}
                          {parts.length &&
                          !parts.some((row) =>
                            `${row.name} ${row.code}`.toLowerCase().includes(partSearch.toLowerCase()),
                          ) ? (
                            <Typography variant="body2" color="text.secondary">
                              No Parts found.
                            </Typography>
                          ) : null}
                        </>
                      )}
                    </Stack>
                  )}
                </Stack>
              )}
            </Paper>
          </Box>
        </Box>
      )}
      {isDirty ? (
        <Paper
          elevation={6}
          role="region"
          aria-label="Unsaved marker changes"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: (theme) => theme.zIndex.drawer - 1,
            p: 1,
            pl: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: 3,
            border: 1,
            borderColor: "primary.main",
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <Typography variant="body2" noWrap>
            {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
          </Typography>
          <Button
            color="inherit"
            variant="text"
            size="small"
            disabled={saving}
            onClick={discard}
            sx={{ flexShrink: 0 }}
          >
            Discard
          </Button>
          <Button
            size="small"
            disabled={saving || markersQuery.isError}
            onClick={() => void saveMarkers()}
            sx={{ flexShrink: 0 }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Paper>
      ) : null}
      <Drawer
        anchor={desktop ? "right" : "bottom"}
        open={!wide && facilityDrawerOpen}
        onClose={() => setFacilityDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: desktop ? 320 : "100%", height: desktop ? "100%" : "75vh", p: 2 } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">Place a Facility</Typography>
          <IconButton aria-label="Close Facilities" onClick={() => setFacilityDrawerOpen(false)}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
        {placementPanel}
      </Drawer>
      <Menu anchorEl={menu?.anchor ?? null} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => editMenuResource()}>
          Edit{" "}
          {menu?.kind === "part" ? "Part" : menu?.kind === "map" ? "Map" : menu?.kind === "view" ? "View" : "Facility"}
        </MenuItem>
        {menu?.kind === "view" ? <MenuItem onClick={() => editMenuResource(true)}>Replace Image</MenuItem> : null}
        {menu?.kind === "map" ? (
          <MenuItem
            disabled={map?.isDefault || !map?.isActive}
            onClick={() => {
              setMenu(null);
              requestChange(() => void setDefault());
            }}
          >
            Set as Default
          </MenuItem>
        ) : null}
        <Divider />
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            if (menu && menuResource) {
              const target = { kind: menu.kind, id: menu.id, name: menuResource.name };
              setMenu(null);
              requestChange(() => setArchive(target));
            }
          }}
        >
          Archive{" "}
          {menu?.kind === "part" ? "Part" : menu?.kind === "map" ? "Map" : menu?.kind === "view" ? "View" : "Facility"}
        </MenuItem>
      </Menu>
      {editor ? (
        <SiteResourceDialog
          key={`${editor.kind}:${editor.id ?? "new"}:${editor.parentId ?? ""}:${!!editor.imageOnly}`}
          editor={editor}
          projectId={projectId}
          onClose={() => setEditor(null)}
          onSaved={onResourceSaved}
        />
      ) : null}
      <Dialog open={!!archive} onClose={() => !saving && setArchive(null)}>
        <DialogTitle>Archive {archive?.name}?</DialogTitle>
        <DialogContent>Existing Activity history will remain available.</DialogContent>
        <DialogActions>
          <Button color="inherit" variant="text" disabled={saving} onClick={() => setArchive(null)}>
            Cancel
          </Button>
          <Button color="error" disabled={saving} onClick={() => void doArchive()}>
            Archive
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!pendingChange || blocker.state === "blocked"} onClose={() => !saving && stay()}>
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>Save your marker changes before leaving, or discard them.</DialogContent>
        <DialogActions sx={{ flexWrap: "wrap" }}>
          <Button color="inherit" variant="text" disabled={saving} onClick={stay}>
            Stay
          </Button>
          <Button
            color="error"
            variant="outlined"
            disabled={saving}
            onClick={() => {
              discard();
              finishLeave();
            }}
          >
            Discard changes
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              if (await saveMarkers()) finishLeave();
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!notice}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice}
        action={
          <IconButton color="inherit" size="small" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        }
      />
    </Box>
  );
}
