import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Alert,
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  MenuItem,
  Pagination,
  Paper,
  Popover,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import { PageHeader } from "@/components/shared/page-header.js";
import { CompactPageHeader } from "@/components/shared/compact-page-header.js";
import { navigationIcons } from "@/app/icons/navigation-icons.js";
import { StatusChip } from "@/components/shared/status-chip.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { useCanManageSiteConfiguration } from "@/features/auth/hooks/use-site-configuration-permission.js";
import {
  useFacilities,
  useFacilityActivities,
  useFacilityMarkers,
  useFacilityParts,
  useFacilitySummaries,
  useMapViews,
  useSiteMaps,
} from "@/hooks/use-site-operations.js";
import { siteOperationKeys } from "@/consts/query-keys/site-operations.js";
import { dailySiteMarkerKeys } from "@/consts/query-keys/daily-site-markers.js";
import { useDailySiteMarkers } from "@/features/site-activity/hooks/use-daily-site-markers.js";
import { dailySiteMarkerApi } from "@/features/site-activity/api/daily-site-marker.api.js";
import { isDailySiteMarkerView } from "@/features/site-activity/utils/daily-site-marker-view.js";
import {
  defaultMapView,
  defaultSiteMap,
  emptyFacilitySelection,
  selectFacility,
  switchMapView,
  switchSiteMap,
} from "@/features/site-maps/helpers/facility-map-state.js";
import { mapToNormalized, normalizedToMap, pointsBounds } from "@/features/site-maps/helpers/coordinates.js";
import { useSitePlanViewport } from "@/features/site-maps/hooks/use-site-plan-viewport.js";
import { SitePlanCanvas, type CanvasMarker } from "@/features/site-maps/components/site-plan-canvas.js";
import { SitePlanViewportControls } from "@/features/site-maps/components/site-plan-viewport-controls.js";
import { FacilityActivityDialog } from "@/features/site-activity/components/facility-activity-dialog.js";
import { ActivityDetailDialog } from "@/features/site-activity/components/activity-detail-dialog.js";
import { DailySiteMarkerDialog } from "@/features/site-activity/components/daily-site-marker-dialog.js";
import { DailySiteMarkerDetails } from "@/features/site-activity/components/daily-site-marker-details.js";
import { DailySiteMarkerLayer } from "@/features/site-activity/components/daily-site-marker-layer.js";
import type { Facility, FacilityState, OperationalStatus, SiteActivityRecord } from "@/types/site-operations.types.js";
import type { DailySiteMarker } from "@/features/site-activity/types/daily-site-marker.types.js";

const ActivityIcon = navigationIcons.sitePlan;

export function SiteActivityView() {
  const theme = useTheme(),
    compact = useMediaQuery(theme.breakpoints.down("md")),
    phone = useMediaQuery(theme.breakpoints.down("sm"));
  const canManage = useCanManageSiteConfiguration();
  const { projectId, projects } = useCurrentProject();
  const projectName = projects.find((project) => project.id === projectId)?.name ?? "Project";
  const client = useQueryClient();
  const [selection, setSelection] = useState(emptyFacilitySelection);
  const [workDate, setWorkDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [contractorId, setContractorId] = useState("all"),
    [status, setStatus] = useState<OperationalStatus | "all">("all"),
    [page, setPage] = useState(1);
  const [editor, setEditor] = useState<SiteActivityRecord | "new" | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [dailyMarkerPlacement, setDailyMarkerPlacement] = useState<
      { kind: "new" } | { kind: "move"; markerId: string } | null
    >(null),
    [dailyMarkerPoint, setDailyMarkerPoint] = useState<{ x: number; y: number } | null>(null),
    [dailyMarkerForm, setDailyMarkerForm] = useState<{ kind: "new" } | { kind: "edit"; markerId: string } | null>(null),
    [selectedDailyMarkerId, setSelectedDailyMarkerId] = useState<string | null>(null),
    [imageFailed, setImageFailed] = useState(false),
    [panelCollapsed, setPanelCollapsed] = useState(false),
    [filtersAnchor, setFiltersAnchor] = useState<null | HTMLElement>(null),
    [dateOpen, setDateOpen] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [copySource, setCopySource] = useState<SiteActivityRecord | null>(null);
  const selectedMetadata = useRef<Facility | null>(null);
  const mapsQuery = useSiteMaps(projectId),
    facilitiesQuery = useFacilities(projectId, "all"),
    contractorsQuery = useProjectContractors(projectId);
  const maps = mapsQuery.data?.data ?? [],
    facilities = facilitiesQuery.data?.data ?? [];
  const mapId = maps.find((row) => row.id === selection.selectedSiteMapId)?.id ?? defaultSiteMap(maps);
  const viewsQuery = useMapViews(projectId, mapId),
    views = viewsQuery.data?.data ?? [];
  const viewId = views.find((row) => row.id === selection.selectedMapViewId)?.id ?? defaultMapView(views);
  const view = views.find((row) => row.id === viewId);
  const dailyMarkersEnabled = isDailySiteMarkerView(view ?? null);
  const dailyMarkersAvailable = dailyMarkersEnabled && !!view?.imageUrl && !!view.width && !!view.height;
  const markersQuery = useFacilityMarkers(projectId, viewId),
    markers = markersQuery.data?.data ?? [];
  const dailyMarkersQuery = useDailySiteMarkers(projectId, viewId, workDate, dailyMarkersAvailable);
  const dailyMarkers = dailyMarkersQuery.data?.data ?? [];
  const selectedDailyMarker = dailyMarkers.find((row) => row.id === selectedDailyMarkerId) ?? null;
  const dailyMarkerBeingEdited =
    dailyMarkerForm?.kind === "edit" ? dailyMarkers.find((row) => row.id === dailyMarkerForm.markerId) : undefined;
  const selectedFacilityId = selection.selectedFacilityId,
    selectedPartId = selection.selectedFacilityPartId;
  const selectedFacility =
    facilities.find((row) => row.id === selectedFacilityId) ??
    markers.find((row) => row.facilityId === selectedFacilityId)?.facility ??
    (selectedMetadata.current?.id === selectedFacilityId && selectedMetadata.current.projectId === projectId
      ? selectedMetadata.current
      : undefined);
  const partsQuery = useFacilityParts(projectId, selectedFacilityId, "all");
  const filters = useMemo(
    () => ({
      workDate,
      contractorId: contractorId === "all" ? undefined : contractorId,
      status: status === "all" ? undefined : status,
    }),
    [workDate, contractorId, status],
  );
  const summariesQuery = useFacilitySummaries(projectId, filters);
  const inspectorSummaries = useFacilitySummaries(
    projectId,
    { ...filters, facilityId: selectedFacilityId ?? undefined, facilityPartId: selectedPartId ?? undefined },
    !!selectedFacilityId,
  );
  const activitiesQuery = useFacilityActivities(
    projectId,
    {
      ...filters,
      facilityId: selectedFacilityId ?? undefined,
      facilityPartId: selectedPartId ?? undefined,
      page,
      pageSize: 20,
    },
    !!selectedFacilityId,
  );
  const summaries = new Map((summariesQuery.data?.data ?? []).map((row) => [row.facilityId, row]));
  const summary = inspectorSummaries.data?.data.find((row) => row.facilityId === selectedFacilityId);
  const viewport = useSitePlanViewport(view?.width ?? 1, view?.height ?? 1);
  const { fitAll } = viewport;
  useEffect(() => {
    setSelection(emptyFacilitySelection);
    selectedMetadata.current = null;
    setContractorId("all");
    setPage(1);
    setDetailId(null);
  }, [projectId]);
  useEffect(() => {
    setImageFailed(false);
    fitAll();
  }, [viewId, view?.width, view?.height, fitAll]);
  useEffect(() => {
    setDailyMarkerPlacement(null);
    setDailyMarkerPoint(null);
    setDailyMarkerForm(null);
    setSelectedDailyMarkerId(null);
  }, [projectId, viewId, workDate]);
  const colors: Record<FacilityState, string> = {
    blocked: theme.palette.error.dark,
    attention: theme.palette.warning.dark,
    active: theme.palette.info.dark,
    completed: theme.palette.success.dark,
    idle: theme.palette.text.secondary,
  };
  const pick = (id: string | null, focus = false) => {
    const facility = facilities.find((row) => row.id === id) ?? markers.find((row) => row.facilityId === id)?.facility;
    if (facility) selectedMetadata.current = facility;
    setSelection((current) => selectFacility(current, id));
    setPage(1);
    const marker = markers.find((row) => row.facilityId === id);
    if (focus && marker && view?.width && view.height)
      viewport.fitBounds(pointsBounds([normalizedToMap(marker, view.width, view.height)]), view.width / 5);
  };
  const handleMapBackgroundClick = () => {
    if (!dailyMarkerPlacement) {
      pick(null);
      return;
    }
    if (!view?.width || !view.height || imageFailed) return;
    const point = viewport.screenToMap();
    if (!point || point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height) return;
    setDailyMarkerPoint(mapToNormalized(point, view.width, view.height));
    setDailyMarkerForm(
      dailyMarkerPlacement.kind === "new" ? { kind: "new" } : { kind: "edit", markerId: dailyMarkerPlacement.markerId },
    );
    setDailyMarkerPlacement(null);
  };
  const startDailyMarkerPlacement = () => {
    if (!dailyMarkersEnabled || !view?.imageUrl || !view.width || !view.height) return;
    setSelectedDailyMarkerId(null);
    setDailyMarkerPoint(null);
    setDailyMarkerPlacement({ kind: "new" });
  };
  const finishDailyMarkerForm = () => {
    setDailyMarkerForm(null);
    setDailyMarkerPoint(null);
  };
  const saveDailyMarker = async (row: DailySiteMarker, isNew: boolean) => {
    if (!projectId || !viewId) return;
    await client.invalidateQueries({ queryKey: dailySiteMarkerKeys.list(projectId, viewId, workDate) });
    finishDailyMarkerForm();
    setSelectedDailyMarkerId(row.id);
    setNotice(isNew ? "Site Marker added" : "Site Marker updated");
  };
  const withdrawDailyMarker = async (id: string) => {
    if (!projectId || !viewId) return;
    await dailySiteMarkerApi.withdraw(id);
    await client.invalidateQueries({ queryKey: dailySiteMarkerKeys.list(projectId, viewId, workDate) });
    setSelectedDailyMarkerId(null);
    setNotice("Site Marker withdrawn");
  };
  const isToday = workDate === dayjs().format("YYYY-MM-DD");
  const contractorName =
    contractorId === "all"
      ? null
      : (contractorsQuery.data?.data.find((row) => row.id === contractorId)?.name ?? contractorId);
  const statusLabel = status === "all" ? null : status[0]!.toUpperCase() + status.slice(1);
  const hasRefinements = !!selectedFacilityId || contractorId !== "all" || status !== "all";
  const showNotPlaced =
    !!selectedFacility &&
    !!view &&
    !markers.some((marker) => marker.facilityId === selectedFacility.id) &&
    !markersQuery.isLoading;
  const secondaryCount = (contractorId !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);
  const shiftDay = (delta: number) => {
    setWorkDate(dayjs(workDate).add(delta, "day").format("YYYY-MM-DD"));
    setPage(1);
  };
  const goToday = () => {
    setWorkDate(dayjs().format("YYYY-MM-DD"));
    setPage(1);
  };
  const clearRefinements = () => {
    pick(null);
    setContractorId("all");
    setStatus("all");
    setPage(1);
  };
  const resetAll = () => {
    setSelection({ ...emptyFacilitySelection, selectedSiteMapId: defaultSiteMap(maps) ?? null });
    setWorkDate(dayjs().format("YYYY-MM-DD"));
    setContractorId("all");
    setStatus("all");
    setPage(1);
  };
  const secondaryFilterControls = (
    <>
      <TextField
        fullWidth
        select
        size="small"
        label="Contractor"
        value={contractorsQuery.data?.data.some((row) => row.id === contractorId) ? contractorId : "all"}
        onChange={(event) => {
          setContractorId(event.target.value);
          setPage(1);
        }}
      >
        <MenuItem value="all">All Contractors</MenuItem>
        {contractorsQuery.data?.data.map((contractor) => (
          <MenuItem key={contractor.id} value={contractor.id}>
            {contractor.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        fullWidth
        select
        size="small"
        label="Status"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as OperationalStatus | "all");
          setPage(1);
        }}
      >
        <MenuItem value="all">All Status</MenuItem>
        {(["blocked", "attention", "active", "completed"] as const).map((state) => (
          <MenuItem key={state} value={state}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  bgcolor: colors[state],
                }}
              />
              {state[0]!.toUpperCase() + state.slice(1)}
            </Stack>
          </MenuItem>
        ))}
      </TextField>
    </>
  );
  const renderedMarkers: CanvasMarker[] = markers.map((marker) => {
    const state = summaries.get(marker.facilityId)?.highestPriorityStatus ?? "idle",
      count = summaries.get(marker.facilityId)?.activityCount ?? 0;
    return {
      key: marker.facilityId,
      ...normalizedToMap(marker, view?.width ?? 1, view?.height ?? 1),
      label: marker.facility.name,
      ariaLabel: `Select ${marker.facility.name}, ${count} Activities, ${state}`,
      statusColor: colors[state],
      activityCount: count,
      idle: state === "idle",
      selected: marker.facilityId === selectedFacilityId,
    };
  });
  const savedActivity = async (activity: SiteActivityRecord, isNew: boolean) => {
    if (!projectId) return;
    await Promise.all([
      client.invalidateQueries({ queryKey: [...siteOperationKeys.project(projectId), "activities"] }),
      client.invalidateQueries({ queryKey: [...siteOperationKeys.project(projectId), "summaries"] }),
      client.invalidateQueries({ queryKey: siteOperationKeys.activity(activity.id) }),
    ]);
    if (activity.facility)
      setSelection((current) => ({
        ...selectFacility(current, activity.facility!.id),
        selectedFacilityPartId: activity.facilityPart?.id ?? null,
      }));
    setPage(1);
    setNotice(isNew ? "Activity added" : "Activity updated");
  };
  const inspector = selectedFacility ? (
    <Box component="aside" aria-label="Facility activity inspector" sx={{ p: 1.5, overflowY: "auto", height: "100%" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
          <Box>
            <Typography variant="h6">{selectedFacility.name}</Typography>
            {selectedFacility.code ? (
              <Typography color="text.secondary" variant="body2">
                {selectedFacility.code}
              </Typography>
            ) : null}
            <Typography color="text.secondary" variant="caption">
              {workDate}
              {!selectedFacility.isActive ? " · Inactive Facility" : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <IconButton size="small" aria-label="Collapse panel" onClick={() => setPanelCollapsed(true)}>
              <ChevronRightOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="Close Facility details" onClick={() => pick(null)}>
              <CloseOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Button variant="contained" fullWidth onClick={() => setEditor("new")} sx={{ height: 44 }}>
          Add Activity
        </Button>
        <StatusChip status={summary?.highestPriorityStatus ?? "idle"} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            py: 1,
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {[
            [summary?.activityCount ?? 0, "Activities"],
            [summary?.contractorCount ?? 0, "Contractors"],
            [summary?.manpowerCount ?? 0, "Workers"],
          ].map(([value, label]) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography variant="h6">{inspectorSummaries.isLoading ? "—" : value}</Typography>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
        {inspectorSummaries.isError ? <Alert severity="error">Work summary could not be loaded.</Alert> : null}
        {partsQuery.isError ? (
          <Alert severity="warning">Work Parts could not be loaded. Facility-wide Activity remains available.</Alert>
        ) : null}
        {(partsQuery.data?.data.length ?? 0) > 0 ? (
          <TextField
            select
            size="small"
            label="Work area"
            value={partsQuery.data?.data.some((row) => row.id === selectedPartId) ? selectedPartId : "all"}
            onChange={(event) => {
              setSelection((current) => ({
                ...current,
                selectedFacilityPartId: event.target.value === "all" ? null : event.target.value,
              }));
              setPage(1);
            }}
          >
            <MenuItem value="all">All work areas</MenuItem>
            {partsQuery.data?.data.map((part) => (
              <MenuItem key={part.id} value={part.id}>
                {part.code} — {part.name}
                {!part.isActive ? " (Inactive)" : ""}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <Typography variant="subtitle2">Today's Activities</Typography>
        {activitiesQuery.isLoading ? <LinearProgress aria-label="Loading Facility Activities" /> : null}
        {activitiesQuery.isError ? (
          <Alert severity="error">
            Activities could not be loaded.{" "}
            <Button variant="text" onClick={() => void activitiesQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : null}
        {activitiesQuery.data?.data.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No Activities for these filters.
          </Typography>
        ) : null}
        <List disablePadding>
          {activitiesQuery.data?.data.map((activity) => (
            <ListItemButton
              key={activity.id}
              onClick={() => setDetailId(activity.id)}
              aria-label={`Open Activity ${activity.title}`}
              sx={{ px: 0, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Stack spacing={0.5} sx={{ width: "100%" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StatusChip status={activity.status} />
                  <Typography variant="body2" fontWeight={600}>
                    {activity.title}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {activity.contractor.name}
                  {activity.facilityPart
                    ? ` · ${activity.facilityPart.code} ${activity.facilityPart.name}`
                    : " · Whole Facility"}
                  {activity.startTime ? ` · ${activity.startTime}` : ""}
                </Typography>
              </Stack>
            </ListItemButton>
          ))}
        </List>
        {(activitiesQuery.data?.meta.total ?? 0) > 20 ? (
          <Pagination
            size="small"
            page={page}
            count={Math.ceil(activitiesQuery.data!.meta.total / 20)}
            onChange={(_, value) => setPage(value)}
          />
        ) : null}
      </Stack>
    </Box>
  ) : null;
  const facilityList = (
    <Box component="aside" aria-label="Facility list" sx={{ p: 1.5, overflowY: "auto", height: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">Facilities · {facilities.length}</Typography>
        <IconButton size="small" aria-label="Collapse panel" onClick={() => setPanelCollapsed(true)}>
          <ChevronRightOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      {facilities.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No Facilities for these filters.
        </Typography>
      ) : null}
      <List disablePadding>
        {facilities.map((row) => {
          const summaryRow = summaries.get(row.id);
          const state = summaryRow?.highestPriorityStatus ?? "idle";
          const count = summaryRow?.activityCount ?? 0;
          const selected = row.id === selectedFacilityId;
          return (
            <ListItemButton
              key={row.id}
              selected={selected}
              onClick={() => pick(row.id)}
              aria-label={`Select ${row.name}`}
              sx={{ px: 1, py: 1, borderRadius: 1, mb: 0.5 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    flexShrink: 0,
                    bgcolor: state === "idle" ? "transparent" : colors[state],
                    border: `1px solid ${colors[state]}`,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={selected ? 600 : 400} noWrap>
                    {row.name}
                    {!row.isActive ? " (Inactive)" : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {count} {count === 1 ? "Activity" : "Activities"}
                  </Typography>
                </Box>
              </Stack>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
  if (!projectId)
    return (
      <Box>
        <PageHeader title="Site Activity" />
        <Alert severity="info">
          No Project is selected.{" "}
          {canManage ? (
            <Button component={RouterLink} to="/projects">
              Create Project
            </Button>
          ) : (
            "Ask an administrator to create a Project."
          )}
        </Alert>
      </Box>
    );
  return (
    // Fill exactly the space below the app shell (64px topbar + 1px border +
    // 48px main padding) so the map flexes instead of pushing the screen into a scroll.
    <Box
      sx={{
        height: { xs: "auto", md: "calc(100dvh - 113px)" },
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "visible", md: "hidden" },
        minHeight: 0,
      }}
    >
      <CompactPageHeader
        icon={<ActivityIcon fontSize="small" color="primary" />}
        title="Site Activity"
        items={[{ label: projectName, to: "/projects" }, { label: "Site Activity" }]}
        actions={
          <Stack direction="row" spacing={1}>
            {dailyMarkersAvailable ? (
              <Button
                variant="outlined"
                startIcon={<AddLocationAltOutlinedIcon fontSize="small" />}
                onClick={startDailyMarkerPlacement}
                sx={{ height: 40 }}
              >
                Site Marker · {dailyMarkers.length}
              </Button>
            ) : null}
            <Button variant="contained" onClick={() => setEditor("new")} sx={{ height: 40 }}>
              Add Activity
            </Button>
          </Stack>
        }
        sx={{ mb: 1 }}
      />
      <Paper
        variant="outlined"
        sx={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: { xs: "none", md: "1 1 auto" },
          minHeight: 0,
        }}
      >
        {phone ? (
          <Stack spacing={1} sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
            {maps.length > 1 ? (
              <TextField
                select
                fullWidth
                size="small"
                label="Site Map"
                value={mapId ?? ""}
                onChange={(event) => setSelection((current) => switchSiteMap(current, event.target.value))}
              >
                {maps.map((map) => (
                  <MenuItem key={map.id} value={map.id}>
                    {map.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 1 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                color="primary"
                value={viewId}
                onChange={(_, id: string | null) => id && setSelection((current) => switchMapView(current, id))}
                aria-label="Map View"
                sx={{ height: 40, flex: 1, "& .MuiToggleButton-root": { px: 1, flex: 1 } }}
              >
                {views.map((row) => (
                  <ToggleButton key={row.id} value={row.id}>
                    {row.name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
                <IconButton
                  size="small"
                  aria-label="Previous day"
                  onClick={() => shiftDay(-1)}
                  sx={{ width: 40, height: 40 }}
                >
                  <ChevronLeftOutlinedIcon fontSize="small" />
                </IconButton>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setDateOpen(true)}
                  aria-label={`Work date ${dayjs(workDate).format("DD MMMM YYYY")}`}
                  sx={{ height: 40, minWidth: 0, px: 1 }}
                >
                  {dayjs(workDate).format("DD MMM")}
                </Button>
                <IconButton
                  size="small"
                  aria-label="Next day"
                  onClick={() => shiftDay(1)}
                  sx={{ width: 40, height: 40 }}
                >
                  <ChevronRightOutlinedIcon fontSize="small" />
                </IconButton>
                {!isToday ? (
                  <Button size="small" onClick={goToday} sx={{ flexShrink: 0, height: 40 }}>
                    Today
                  </Button>
                ) : null}
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Autocomplete
                size="small"
                options={facilities}
                value={selectedFacility ?? null}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(row) => `${row.name}${!row.isActive ? " (Inactive)" : ""}`}
                onChange={(_, facility) => pick(facility?.id ?? null)}
                renderInput={(params) => <TextField {...params} label="Facility" placeholder="All Facilities" />}
                sx={{ flex: 1, minWidth: 0 }}
              />
              <Badge badgeContent={secondaryCount} color="primary" sx={{ flexShrink: 0 }}>
                <Button
                  size="small"
                  startIcon={<FilterListOutlinedIcon fontSize="small" />}
                  onClick={(event) => setFiltersAnchor(event.currentTarget)}
                  aria-label="Filters"
                  sx={{ height: 40 }}
                >
                  Filters
                </Button>
              </Badge>
            </Stack>
            <DatePicker
              open={dateOpen}
              onClose={() => setDateOpen(false)}
              value={dayjs(workDate)}
              onChange={(date) => {
                if (date?.isValid()) {
                  setWorkDate(date.format("YYYY-MM-DD"));
                  setPage(1);
                }
              }}
              slotProps={{ textField: { sx: { display: "none" } } }}
            />
          </Stack>
        ) : (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
              sx={{
                px: 1.5,
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
                flexWrap: "wrap",
                rowGap: 1,
              }}
            >
              {maps.length > 1 ? (
                <TextField
                  select
                  size="small"
                  label="Site Map"
                  value={mapId ?? ""}
                  sx={{ minWidth: 160, flex: "0 1 190px" }}
                  onChange={(event) => setSelection((current) => switchSiteMap(current, event.target.value))}
                >
                  {maps.map((map) => (
                    <MenuItem key={map.id} value={map.id}>
                      {map.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography variant="subtitle2" sx={{ alignSelf: "center" }}>
                  {maps[0]?.name ?? "Site Maps"}
                </Typography>
              )}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  View
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={viewId}
                  onChange={(_, id: string | null) => id && setSelection((current) => switchMapView(current, id))}
                  aria-label="Map View"
                  sx={{ height: 40, "& .MuiToggleButton-root": { px: 2.5 } }}
                >
                  {views.map((row) => (
                    <ToggleButton key={row.id} value={row.id}>
                      {row.name}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <IconButton
                  size="small"
                  aria-label="Previous day"
                  onClick={() => shiftDay(-1)}
                  sx={{ width: 40, height: 40 }}
                >
                  <ChevronLeftOutlinedIcon fontSize="small" />
                </IconButton>
                <DatePicker
                  label="Work date"
                  value={dayjs(workDate)}
                  onChange={(date) => {
                    if (date?.isValid()) {
                      setWorkDate(date.format("YYYY-MM-DD"));
                      setPage(1);
                    }
                  }}
                  slotProps={{ textField: { size: "small", sx: { width: 148 } } }}
                />
                <IconButton
                  size="small"
                  aria-label="Next day"
                  onClick={() => shiftDay(1)}
                  sx={{ width: 40, height: 40 }}
                >
                  <ChevronRightOutlinedIcon fontSize="small" />
                </IconButton>
                <Button size="small" onClick={goToday} disabled={isToday} sx={{ flexShrink: 0, height: 40 }}>
                  Today
                </Button>
              </Stack>
              <Autocomplete
                size="small"
                options={facilities}
                value={selectedFacility ?? null}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                getOptionLabel={(row) => `${row.name}${!row.isActive ? " (Inactive)" : ""}`}
                onChange={(_, facility) => pick(facility?.id ?? null)}
                renderInput={(params) => <TextField {...params} label="Facility" placeholder="All Facilities" />}
                sx={{ flex: "1 1 200px", minWidth: { xs: "100%", sm: 180 } }}
              />
              <Badge badgeContent={secondaryCount} color="primary" sx={{ flexShrink: 0 }}>
                <Button
                  size="small"
                  startIcon={<FilterListOutlinedIcon fontSize="small" />}
                  onClick={(event) => setFiltersAnchor(event.currentTarget)}
                  aria-label="More filters"
                  sx={{ height: 40 }}
                >
                  More filters
                </Button>
              </Badge>
              <Button
                size="small"
                onClick={clearRefinements}
                disabled={!hasRefinements}
                title="Clear filters"
                sx={{ flexShrink: 0, height: 40 }}
              >
                Clear
              </Button>
            </Stack>
          </>
        )}
        {mapsQuery.isError || viewsQuery.isError || markersQuery.isError || facilitiesQuery.isError ? (
          <Alert severity="error">
            Some site information could not be loaded. Activities remain available through the Facility selector.
          </Alert>
        ) : null}
        {contractorsQuery.isError ? (
          <Alert severity="error">
            Contractor filters could not be loaded.{" "}
            <Button variant="text" onClick={() => void contractorsQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : null}
        {summariesQuery.isError ? (
          <Alert severity="error">
            Operational summaries could not be loaded. The site image remains available.{" "}
            <Button variant="text" onClick={() => void summariesQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : null}
        {dailyMarkersEnabled && dailyMarkersQuery.isError ? (
          <Alert severity="error">
            Daily Site Markers could not be loaded.{" "}
            <Button variant="text" onClick={() => void dailyMarkersQuery.refetch()}>
              Retry
            </Button>
          </Alert>
        ) : null}
        <Box
          sx={{
            display: "flex",
            height: { xs: "auto", md: "auto" },
            flex: { xs: "none", md: "1 1 auto" },
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              position: "relative",
              flex: "1 1 auto",
              minWidth: 0,
              height: { xs: "clamp(360px, 52vh, 520px)", md: "100%" },
              overflow: "hidden",
            }}
          >
            {view?.imageUrl && view.width && view.height ? (
              <>
                <SitePlanCanvas
                  key={view.id}
                  backgroundUrl={view.imageUrl}
                  mapW={view.width}
                  mapH={view.height}
                  markers={renderedMarkers}
                  showLabels={false}
                  cursor={dailyMarkerPlacement ? "crosshair" : "default"}
                  stageDraggable
                  viewport={viewport.view}
                  containerRef={viewport.containerRef}
                  stageRef={viewport.stageRef}
                  size={viewport.size}
                  onStageClick={handleMapBackgroundClick}
                  onStageDrag={viewport.onStageDrag}
                  onMarkerClick={(id) => {
                    if (!dailyMarkerPlacement) pick(id);
                  }}
                  onImageLoad={() => setImageFailed(false)}
                  onImageError={() => setImageFailed(true)}
                />
                {dailyMarkersEnabled ? (
                  <DailySiteMarkerLayer
                    markers={dailyMarkers}
                    mapWidth={view.width}
                    mapHeight={view.height}
                    viewport={viewport.view}
                    size={viewport.size}
                    selectedId={selectedDailyMarkerId}
                    onSelect={(id) => {
                      setDailyMarkerPlacement(null);
                      setDailyMarkerPoint(null);
                      setDetailId(null);
                      setSelectedDailyMarkerId(id);
                    }}
                  />
                ) : null}
                <SitePlanViewportControls viewport={viewport} compact />
                {dailyMarkerPlacement ? (
                  <Paper
                    elevation={3}
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.75,
                      pl: 1.5,
                      pr: 0.75,
                      maxWidth: "calc(100% - 24px)",
                      borderRadius: 2,
                    }}
                  >
                    <AddLocationAltOutlinedIcon fontSize="small" color="primary" />
                    <Typography variant="body2" noWrap>
                      {dailyMarkerPlacement.kind === "new"
                        ? "Tap the map where this is happening"
                        : "Tap the new location"}
                    </Typography>
                    <Button size="small" onClick={() => setDailyMarkerPlacement(null)}>
                      Cancel
                    </Button>
                  </Paper>
                ) : null}
              </>
            ) : (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">
                  {maps.length === 0 ? "No Site Maps yet" : "This View has no image yet"}
                </Typography>
                <Typography color="text.secondary">
                  Facilities and their Activities are available even without a Map.
                </Typography>
                {canManage ? (
                  <Button component={RouterLink} to="/site-configuration">
                    Open Site Configuration
                  </Button>
                ) : null}
              </Box>
            )}
            {imageFailed ? (
              <Alert severity="error" sx={{ position: "absolute", top: 8, left: 8, right: 8 }}>
                Image could not be loaded. Select another View or use the Facility selector.
              </Alert>
            ) : null}
            {mapsQuery.isLoading || viewsQuery.isLoading || summariesQuery.isFetching ? (
              <LinearProgress
                aria-label="Loading site information"
                sx={{ position: "absolute", left: 0, right: 0, top: 0 }}
              />
            ) : null}
            {!dailyMarkerPlacement && (showNotPlaced || hasRefinements) ? (
              <Stack
                sx={{
                  position: "absolute",
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 2,
                  alignItems: "center",
                  gap: 1,
                  maxWidth: "calc(100% - 24px)",
                }}
              >
                {showNotPlaced ? (
                  <Paper
                    elevation={4}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      pl: 1.5,
                      pr: 2,
                      py: 1,
                      borderRadius: 999,
                      maxWidth: "100%",
                    }}
                  >
                    <InfoOutlinedIcon fontSize="small" color="info" />
                    <Typography variant="body2" noWrap>
                      {selectedFacility!.name} is not placed on this View.
                    </Typography>
                  </Paper>
                ) : null}
                {hasRefinements ? (
                  <Paper
                    elevation={4}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      pl: 1.5,
                      pr: 0.5,
                      py: 0.5,
                      borderRadius: 999,
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                      Filtered by
                    </Typography>
                    {selectedFacility ? (
                      <Chip size="small" color="primary" label={selectedFacility.name} onDelete={() => pick(null)} />
                    ) : null}
                    {contractorName ? (
                      <Chip
                        size="small"
                        color="primary"
                        label={contractorName}
                        onDelete={() => {
                          setContractorId("all");
                          setPage(1);
                        }}
                      />
                    ) : null}
                    {statusLabel ? (
                      <Chip
                        size="small"
                        color="primary"
                        label={statusLabel}
                        onDelete={() => {
                          setStatus("all");
                          setPage(1);
                        }}
                      />
                    ) : null}
                    <Button size="small" variant="text" onClick={resetAll} sx={{ flexShrink: 0 }}>
                      Reset to default
                    </Button>
                  </Paper>
                ) : null}
              </Stack>
            ) : null}
          </Box>
          {!compact ? (
            panelCollapsed ? (
              <Box
                sx={{
                  width: 48,
                  flexShrink: 0,
                  minHeight: 0,
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "center",
                  pt: 1.5,
                }}
              >
                <IconButton size="small" aria-label="Expand panel" onClick={() => setPanelCollapsed(false)}>
                  <ChevronLeftOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Box
                sx={{
                  width: "30%",
                  minWidth: 260,
                  maxWidth: 360,
                  flexShrink: 0,
                  minHeight: 0,
                  borderLeft: "1px solid",
                  borderColor: "divider",
                }}
              >
                {selectedFacility ? inspector : facilityList}
              </Box>
            )
          ) : null}
        </Box>
      </Paper>
      {phone ? (
        <Drawer
          anchor="bottom"
          open={!!filtersAnchor}
          onClose={() => setFiltersAnchor(null)}
          slotProps={{ paper: { sx: { borderRadius: "12px 12px 0 0", p: 2 } } }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1">Filters</Typography>
            <IconButton aria-label="Close filters" onClick={() => setFiltersAnchor(null)}>
              <CloseOutlinedIcon />
            </IconButton>
          </Stack>
          <Stack spacing={1.5}>
            {secondaryFilterControls}
            <Divider />
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                variant="text"
                onClick={() => {
                  clearRefinements();
                  setFiltersAnchor(null);
                }}
                sx={{ flex: 1 }}
              >
                Reset filters
              </Button>
              <Button variant="contained" onClick={() => setFiltersAnchor(null)} sx={{ flex: 2 }}>
                Show results
              </Button>
            </Stack>
          </Stack>
        </Drawer>
      ) : (
        <Popover
          open={!!filtersAnchor}
          anchorEl={filtersAnchor}
          onClose={() => setFiltersAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Stack spacing={1.5} sx={{ p: 2, width: 250 }}>
            <Typography variant="subtitle2">More filters</Typography>
            {secondaryFilterControls}
          </Stack>
        </Popover>
      )}
      <Drawer
        anchor="bottom"
        open={compact && !!selectedFacility && !selectedDailyMarker}
        onClose={() => pick(null)}
        slotProps={{ paper: { sx: { maxHeight: "70vh", borderRadius: "12px 12px 0 0" } } }}
      >
        <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewId}
            onChange={(_, id: string | null) => id && setSelection((current) => switchMapView(current, id))}
          >
            {views.map((row) => (
              <ToggleButton key={row.id} value={row.id}>
                {row.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button onClick={() => setEditor("new")}>Add Activity</Button>
        </Stack>
        {inspector}
      </Drawer>
      <DailySiteMarkerDetails
        marker={selectedDailyMarker}
        onClose={() => setSelectedDailyMarkerId(null)}
        onEdit={() => {
          if (!selectedDailyMarker) return;
          setDailyMarkerPoint({ x: selectedDailyMarker.x, y: selectedDailyMarker.y });
          setDailyMarkerForm({ kind: "edit", markerId: selectedDailyMarker.id });
          setSelectedDailyMarkerId(null);
        }}
        onMove={() => {
          if (!selectedDailyMarker) return;
          setDailyMarkerPoint(null);
          setDailyMarkerPlacement({ kind: "move", markerId: selectedDailyMarker.id });
          setSelectedDailyMarkerId(null);
        }}
        onWithdraw={() => (selectedDailyMarker ? withdrawDailyMarker(selectedDailyMarker.id) : Promise.resolve())}
      />
      {editor ? (
        <FacilityActivityDialog
          key={editor === "new" ? `new:${copySource?.id ?? ""}` : editor.id}
          projectId={projectId}
          defaultDate={workDate}
          defaultFacilityId={selectedFacilityId}
          defaultPartId={selectedPartId}
          activity={editor === "new" ? undefined : editor}
          sourceActivity={editor === "new" ? copySource : undefined}
          onClose={() => {
            setEditor(null);
            setCopySource(null);
          }}
          onSaved={savedActivity}
        />
      ) : null}
      {dailyMarkerForm && dailyMarkerPoint && (dailyMarkerForm.kind === "new" || dailyMarkerBeingEdited) ? (
        <DailySiteMarkerDialog
          key={dailyMarkerForm.kind === "new" ? "new-daily-site-marker" : dailyMarkerForm.markerId}
          projectId={projectId}
          siteMapViewId={viewId!}
          workDate={workDate}
          position={dailyMarkerPoint}
          marker={dailyMarkerForm.kind === "edit" ? dailyMarkerBeingEdited : undefined}
          onClose={finishDailyMarkerForm}
          onSaved={saveDailyMarker}
        />
      ) : null}
      {detailId ? (
        <ActivityDetailDialog
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(activity) => {
            setDetailId(null);
            setEditor(activity);
          }}
          onCopyToToday={(activity) => {
            setDetailId(null);
            setCopySource(activity);
            setEditor("new");
          }}
        />
      ) : null}
      <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice} />
    </Box>
  );
}
