import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { PageHeader } from "@/components/ui/page-header.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { useCanManageSiteConfiguration } from "@/features/auth/hooks/use-site-configuration-permission.js";
import {
  siteOperationKeys,
  useFacilities,
  useFacilityActivities,
  useFacilityMarkers,
  useFacilityParts,
  useFacilitySummaries,
  useMapViews,
  useSiteMaps,
} from "../hooks/use-site-operations.js";
import {
  defaultMapView,
  defaultSiteMap,
  emptyFacilitySelection,
  selectFacility,
  switchMapView,
  switchSiteMap,
} from "../utils/facility-map-state.js";
import { normalizedToMap, pointsBounds } from "../utils/coordinates.js";
import { useSitePlanViewport } from "../hooks/use-site-plan-viewport.js";
import { SitePlanCanvas, type CanvasMarker } from "./site-plan-canvas.js";
import { SitePlanViewportControls } from "./site-plan-viewport-controls.js";
import { FacilityActivityDialog } from "./facility-activity-dialog.js";
import { ActivityDetailDialog } from "./activity-detail-dialog.js";
import type { Facility, FacilityState, OperationalStatus, SiteActivityRecord } from "../types/site-operations.types.js";

export function SiteActivityView() {
  const theme = useTheme(),
    compact = useMediaQuery(theme.breakpoints.down("md"));
  const canManage = useCanManageSiteConfiguration();
  const { projectId } = useCurrentProject();
  const client = useQueryClient();
  const [selection, setSelection] = useState(emptyFacilitySelection);
  const [workDate, setWorkDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [contractorId, setContractorId] = useState("all"),
    [status, setStatus] = useState<OperationalStatus | "all">("all"),
    [page, setPage] = useState(1);
  const [editor, setEditor] = useState<SiteActivityRecord | "new" | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [imageFailed, setImageFailed] = useState(false);
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
  const markersQuery = useFacilityMarkers(projectId, viewId),
    markers = markersQuery.data?.data ?? [];
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
  const savedActivity = async (activity: SiteActivityRecord) => {
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
  };
  const inspector = selectedFacility ? (
    <Box component="aside" aria-label="Facility activity inspector" sx={{ p: 2, overflowY: "auto", height: "100%" }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
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
          <IconButton size="small" aria-label="Close Facility details" onClick={() => pick(null)}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
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
    <Box>
      <PageHeader
        title="Site Activity"
        subtitle="See where work is happening, then inspect Activities by Facility."
        actions={
          <Button variant="contained" onClick={() => setEditor("new")}>
            Add Activity
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {maps.length > 1 ? (
            <TextField
              select
              size="small"
              label="Site Map"
              value={mapId ?? ""}
              sx={{ minWidth: 200 }}
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
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewId}
            onChange={(_, id: string | null) => id && setSelection((current) => switchMapView(current, id))}
            aria-label="Map View"
          >
            {views.map((row) => (
              <ToggleButton key={row.id} value={row.id}>
                {row.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        <Grid container spacing={1.25} sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <DatePicker
              label="Work date"
              value={dayjs(workDate)}
              onChange={(date) => {
                if (date?.isValid()) {
                  setWorkDate(date.format("YYYY-MM-DD"));
                  setPage(1);
                }
              }}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Autocomplete
              size="small"
              options={facilities}
              value={selectedFacility ?? null}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              getOptionLabel={(row) => `${row.name}${!row.isActive ? " (Inactive)" : ""}`}
              onChange={(_, facility) => pick(facility?.id ?? null, true)}
              renderInput={(params) => <TextField {...params} label="Facility" placeholder="All Facilities" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
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
                  {state[0]!.toUpperCase() + state.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
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
        {selectedFacility &&
        view &&
        !markers.some((marker) => marker.facilityId === selectedFacility.id) &&
        !markersQuery.isLoading ? (
          <Alert severity="info">
            {selectedFacility.name} is not placed on this View. Its Activities remain available.
          </Alert>
        ) : null}
        <Box sx={{ display: "flex", height: { xs: "auto", md: "clamp(520px, calc(100vh - 290px), 720px)" } }}>
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
                  stageDraggable
                  viewport={viewport.view}
                  containerRef={viewport.containerRef}
                  stageRef={viewport.stageRef}
                  size={viewport.size}
                  onStageClick={() => pick(null)}
                  onStageDrag={viewport.onStageDrag}
                  onMarkerClick={(id) => pick(id)}
                  onImageLoad={() => setImageFailed(false)}
                  onImageError={() => setImageFailed(true)}
                />
                <SitePlanViewportControls viewport={viewport} compact />
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
            <Paper
              variant="outlined"
              sx={{ position: "absolute", bottom: 10, right: 10, p: 1, maxWidth: "calc(100% - 70px)" }}
            >
              <Typography variant="caption" color="text.secondary">
                Current filters
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {(["blocked", "attention", "active", "completed", "idle"] as const).map((state) => (
                  <Stack key={state} direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: state === "idle" ? "transparent" : colors[state],
                        border: `1px solid ${colors[state]}`,
                      }}
                    />
                    <Typography variant="caption">{state[0]!.toUpperCase() + state.slice(1)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>
          {!compact && selectedFacility ? (
            <Box
              sx={{
                width: "34%",
                minWidth: 280,
                maxWidth: 440,
                flexShrink: 0,
                borderLeft: "1px solid",
                borderColor: "divider",
              }}
            >
              {inspector}
            </Box>
          ) : null}
        </Box>
      </Paper>
      <Drawer
        anchor="bottom"
        open={compact && !!selectedFacility}
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
      {editor ? (
        <FacilityActivityDialog
          key={editor === "new" ? "new" : editor.id}
          projectId={projectId}
          defaultDate={workDate}
          defaultFacilityId={selectedFacilityId}
          defaultPartId={selectedPartId}
          activity={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={savedActivity}
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
        />
      ) : null}
    </Box>
  );
}
