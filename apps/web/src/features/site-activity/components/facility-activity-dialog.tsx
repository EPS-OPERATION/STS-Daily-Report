import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs from "dayjs";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useFacilities, useFacilityActivities, useFacilityParts } from "@/hooks/use-site-operations.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { siteOperationsApi } from "@/services/site-operations.api.js";
import { autoSelectContractorId, writableContractorIds } from "@/features/site-activity/utils/activity-contractor.js";
import {
  buildReuseDraft,
  findDuplicate,
  rankSuggestions,
  relativeDayLabel,
} from "@/features/site-activity/utils/activity-reuse.js";
import type { SiteActivityRecord } from "@/types/site-operations.types.js";

const schema = z.object({
  facilityId: z.string().uuid("Choose a Facility"),
  facilityPartId: z.string().uuid().nullable(),
  contractorId: z.string().uuid("Choose a Contractor"),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a work date"),
  title: z.string().trim().min(1, "Activity title is required").max(300),
  description: z.string().max(2000),
  status: z.enum(["active", "attention", "blocked", "completed"]),
  manpower: z.coerce.number().int().min(0).max(100000),
  progressPercent: z.coerce.number().int().min(0).max(100),
  startTime: z.string(),
  endTime: z.string(),
});
type Values = z.infer<typeof schema>;
export function FacilityActivityDialog({
  projectId,
  defaultDate,
  defaultFacilityId,
  defaultPartId,
  activity,
  sourceActivity,
  onClose,
  onSaved,
}: {
  projectId: string;
  defaultDate: string;
  defaultFacilityId?: string | null;
  defaultPartId?: string | null;
  activity?: SiteActivityRecord;
  sourceActivity?: SiteActivityRecord | null;
  onClose: () => void;
  onSaved: (record: SiteActivityRecord, isNew: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const contextFacilityId = defaultFacilityId ?? "";
  const initialFacilityId = activity?.facility?.id ?? contextFacilityId;
  const facilities = useFacilities(projectId, "all"),
    contractors = useProjectContractors(projectId);
  const me = useMe();
  const [error, setError] = useState<string | null>(null);
  const [changeContext, setChangeContext] = useState(!initialFacilityId);
  const [autoApplied, setAutoApplied] = useState(false);
  const [mode, setMode] = useState<"choose" | "form">("choose");
  const [reuseSource, setReuseSource] = useState<SiteActivityRecord | null>(null);
  const [contractorCleared, setContractorCleared] = useState(false);
  const [sourcePartId, setSourcePartId] = useState<string | null>(null);
  const [partNotice, setPartNotice] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<SiteActivityRecord | null>(null);
  const [dupAcked, setDupAcked] = useState(false);
  const appliedSourceId = useRef<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      facilityId: initialFacilityId,
      facilityPartId: activity?.facilityPart?.id ?? defaultPartId ?? null,
      contractorId: activity?.contractor.id ?? "",
      workDate: activity?.workDate ?? defaultDate,
      title: activity?.title ?? "",
      description: activity?.description ?? "",
      status: activity?.status ?? "active",
      // Empty (not zero) so a blank Workers field never looks like submitted data.
      manpower: (activity?.manpower ?? "") as unknown as number,
      progressPercent: activity?.progressPercent ?? 0,
      startTime: activity?.startTime ?? "",
      endTime: activity?.endTime ?? "",
    },
  });
  const facilityId = useWatch({ control, name: "facilityId" }),
    selectedPartId = useWatch({ control, name: "facilityPartId" }),
    workDateValue = useWatch({ control, name: "workDate" }),
    contractorValue = useWatch({ control, name: "contractorId" }),
    titleValue = useWatch({ control, name: "title" });
  const parts = useFacilityParts(projectId, facilityId || null, "active");
  const partOptions = useMemo(() => parts.data?.data ?? [], [parts.data]);
  const facilityName = facilities.data?.data.find((row) => row.id === facilityId)?.name;
  const partName = partOptions.find((row) => row.id === selectedPartId)?.name;

  const projectRows = useMemo(() => contractors.data?.data ?? [], [contractors.data]);
  const membershipIds = useMemo(() => me.data?.data.contractors.map((row) => row.id) ?? [], [me.data]);
  const isAdmin = !!me.data?.data.user.canManageSiteConfiguration;
  const writableIds = useMemo(
    () =>
      me.data
        ? writableContractorIds({ isAdmin, membershipIds, projectIds: projectRows.map((row) => row.id) })
        : projectRows.map((row) => row.id),
    [me.data, isAdmin, membershipIds, projectRows],
  );
  const singleWritableId = useMemo(() => {
    if (activity || !me.data || !contractors.data) return undefined;
    return (
      autoSelectContractorId({
        isNew: true,
        current: "",
        membershipIds,
        projectIds: projectRows.map((row) => row.id),
      }) ?? undefined
    );
  }, [activity, me.data, contractors.data, membershipIds, projectRows]);
  const options = projectRows.filter((row) => writableIds.includes(row.id));
  const persistedId = activity?.contractor.id;
  const persistedMissing = !!persistedId && !options.some((row) => row.id === persistedId);
  const noWritable = !!me.data && !isAdmin && writableIds.length === 0;

  const suggestionFilters = useMemo(
    () => ({
      facilityId: contextFacilityId || undefined,
      contractorId: singleWritableId,
      before: defaultDate,
      pageSize: 10,
    }),
    [contextFacilityId, singleWritableId, defaultDate],
  );
  const suggestionsQuery = useFacilityActivities(projectId, suggestionFilters, !activity && !!contextFacilityId);
  const rankedSuggestions = useMemo(() => {
    const cutoff = dayjs(defaultDate).subtract(7, "day").format("YYYY-MM-DD");
    const windowed = (suggestionsQuery.data?.data ?? []).filter(
      (row) => row.workDate >= cutoff && row.workDate < defaultDate,
    );
    return rankSuggestions(windowed, {
      contractorId: singleWritableId ?? null,
      partId: defaultPartId ?? null,
      limit: 5,
    });
  }, [suggestionsQuery.data, singleWritableId, defaultPartId, defaultDate]);
  const contextFacility = facilities.data?.data.find((row) => row.id === contextFacilityId);
  const canSuggest = !activity && !!contextFacilityId && contextFacility?.isActive !== false;

  const applyReuse = useCallback(
    (source: SiteActivityRecord) => {
      const draft = buildReuseDraft(source, {
        contractorId: writableIds.includes(source.contractor.id) ? source.contractor.id : null,
      });
      if (draft.facilityId) setValue("facilityId", draft.facilityId);
      setValue("title", draft.title);
      setValue("description", draft.description);
      setValue("status", draft.status);
      setValue("manpower", draft.manpower);
      setValue("progressPercent", draft.progressPercent);
      setValue("startTime", draft.startTime);
      setValue("endTime", draft.endTime);
      setValue("contractorId", draft.contractorId ?? "");
      setValue("facilityPartId", draft.facilityPartId);
      setContractorCleared(!draft.contractorId);
      setAutoApplied(false);
      setSourcePartId(draft.facilityPartId);
      setPartNotice(null);
      setReuseSource(source);
      setDuplicate(null);
      setDupAcked(false);
      setMode("form");
    },
    [setValue, writableIds],
  );
  const startFresh = () => {
    setValue("title", "");
    setValue("description", "");
    setValue("status", "active");
    setValue("manpower", "" as unknown as number);
    setValue("progressPercent", 0);
    setValue("startTime", "");
    setValue("endTime", "");
    setValue("facilityPartId", defaultPartId ?? null);
    setAutoApplied(false);
    setContractorCleared(false);
    setReuseSource(null);
    setSourcePartId(null);
    setPartNotice(null);
    setDuplicate(null);
    setDupAcked(false);
    setMode("form");
  };

  useEffect(() => {
    if (!canSuggest) setMode("form");
    else if (mode === "choose" && !suggestionsQuery.isLoading && rankedSuggestions.length === 0) setMode("form");
  }, [canSuggest, mode, suggestionsQuery.isLoading, rankedSuggestions.length]);
  useEffect(() => {
    if (!sourceActivity || activity || appliedSourceId.current === sourceActivity.id) return;
    if (!me.data || !contractors.data) return;
    appliedSourceId.current = sourceActivity.id;
    applyReuse(sourceActivity);
  }, [sourceActivity, activity, me.data, contractors.data, applyReuse]);
  useEffect(() => {
    if (contractors.data && !contractors.data.data.some((row) => row.id === activity?.contractor.id) && activity)
      setValue("contractorId", "");
  }, [contractors.data, activity, setValue]);
  useEffect(() => {
    if (activity || contractorValue || !singleWritableId) return;
    setValue("contractorId", singleWritableId, { shouldValidate: true });
    setAutoApplied(true);
  }, [activity, contractorValue, singleWritableId, setValue]);
  useEffect(() => {
    if (!sourcePartId || parts.isLoading || parts.isError) return;
    if (!partOptions.some((row) => row.id === sourcePartId)) {
      setValue("facilityPartId", null);
      setPartNotice("The previous Work Part is no longer available and was cleared.");
    }
    setSourcePartId(null);
  }, [sourcePartId, parts.isLoading, parts.isError, partOptions, setValue]);
  useEffect(() => {
    setDuplicate(null);
    setDupAcked(false);
  }, [titleValue, contractorValue, selectedPartId, workDateValue, facilityId]);
  const contractorHelper =
    errors.contractorId?.message ??
    (!contractorValue && contractorCleared
      ? "Previous Contractor isn't available for your account."
      : !contractorValue && noWritable
        ? "No Contractor is assigned to your account for this Project."
        : autoApplied
          ? "Auto-selected from your account"
          : undefined);
  const submit = handleSubmit(async (values) => {
    if (facilities.data?.data.find((row) => row.id === values.facilityId)?.isActive === false) {
      fieldError("facilityId", { message: "Choose an active Facility" });
      return;
    }
    if (values.facilityPartId && (parts.isError || parts.isLoading)) {
      fieldError("facilityPartId", { message: "Retry loading Work Parts or choose Whole Facility." });
      return;
    }
    if (contractors.isError || contractors.isLoading) return;
    if (!activity && !dupAcked) {
      const existing = await siteOperationsApi.activities(projectId, {
        workDate: values.workDate,
        facilityId: values.facilityId,
        contractorId: values.contractorId,
        pageSize: 20,
      });
      const match = findDuplicate(existing.data, {
        title: values.title,
        contractorId: values.contractorId,
        partId: values.facilityPartId ?? null,
      });
      if (match) {
        setDuplicate(match);
        setDupAcked(true);
        return;
      }
    }
    setError(null);
    try {
      const result = await siteOperationsApi.saveActivity(projectId, activity?.id ?? null, {
        ...values,
        startTime: values.startTime || (activity ? null : undefined),
        endTime: values.endTime || (activity ? null : undefined),
      });
      await onSaved(result.data, !activity);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Activity could not be saved.");
    }
  });
  return (
    <Dialog open onClose={() => !isSubmitting && onClose()} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{activity ? "Edit Activity" : "Add Activity"}</DialogTitle>
        <DialogContent>
          {mode === "choose" && !activity ? (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Recent at this Facility</Typography>
                {suggestionsQuery.isLoading
                  ? [0, 1, 2].map((index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Loading recent work…
                        </Typography>
                      </Paper>
                    ))
                  : rankedSuggestions.map((row) => (
                      <Paper
                        key={row.id}
                        variant="outlined"
                        sx={{ p: 1.5, display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {relativeDayLabel(row.workDate, defaultDate)} · {row.contractor.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.manpower} workers · {row.progressPercent}%
                            {row.facilityPart ? ` · ${row.facilityPart.code}` : ""}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => applyReuse(row)}
                          aria-label={`Use ${row.title} again`}
                          sx={{ flexShrink: 0 }}
                        >
                          Use again
                        </Button>
                      </Paper>
                    ))}
              </Stack>
              <Button variant="outlined" startIcon={<AddOutlinedIcon />} onClick={startFresh}>
                New Activity
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              {!activity && canSuggest && rankedSuggestions.length > 0 ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setMode("choose")}
                  sx={{ alignSelf: "flex-start", p: 0, minWidth: 0 }}
                >
                  ‹ Recent
                </Button>
              ) : null}
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <PlaceOutlinedIcon color="primary" sx={{ mt: 0.25 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {facilityName ?? "Choose a Facility"}
                  </Typography>
                  {partName ? (
                    <Typography variant="body2" color="text.secondary">
                      {partName}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(workDateValue).format("DD MMM YYYY")}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => setChangeContext((current) => !current)} sx={{ flexShrink: 0 }}>
                  {changeContext ? "Hide" : "Change"}
                </Button>
              </Stack>
              {partNotice ? <Alert severity="info">{partNotice}</Alert> : null}
              {changeContext ? (
                <>
                  {facilities.isError ? (
                    <Alert severity="error">
                      Facilities could not be loaded.{" "}
                      <Button variant="text" onClick={() => void facilities.refetch()}>
                        Retry
                      </Button>
                    </Alert>
                  ) : null}
                  <Controller
                    name="facilityId"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        options={facilities.data?.data ?? []}
                        value={facilities.data?.data.find((row) => row.id === field.value) ?? null}
                        loading={facilities.isLoading}
                        getOptionLabel={(row) => row.name}
                        getOptionDisabled={(row) => !row.isActive}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_, facility) => {
                          const id = facility?.id ?? "";
                          if (id !== field.value) setValue("facilityPartId", null);
                          field.onChange(id);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Facility"
                            error={!!errors.facilityId}
                            helperText={errors.facilityId?.message}
                          />
                        )}
                      />
                    )}
                  />
                  <TextField
                    label="Work date"
                    type="date"
                    {...register("workDate")}
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!errors.workDate}
                    helperText={errors.workDate?.message}
                  />
                </>
              ) : null}
              {contractors.isError ? (
                <Alert severity="error">
                  Contractors could not be loaded.{" "}
                  <Button variant="text" onClick={() => void contractors.refetch()}>
                    Retry
                  </Button>
                </Alert>
              ) : null}
              {contractors.data?.data.length === 0 ? (
                <Alert severity="info">Assign a Contractor to this Project before adding work.</Alert>
              ) : null}
              <Controller
                name="contractorId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    required
                    label="Contractor"
                    {...field}
                    value={options.some((row) => row.id === field.value) ? field.value : (persistedId ?? "")}
                    onChange={(event) => {
                      setAutoApplied(false);
                      setContractorCleared(false);
                      field.onChange(event.target.value);
                    }}
                    error={!!errors.contractorId}
                    helperText={contractorHelper}
                  >
                    <MenuItem value="">Choose Contractor</MenuItem>
                    {options.map((row) => (
                      <MenuItem key={row.id} value={row.id}>
                        {row.code} — {row.name}
                      </MenuItem>
                    ))}
                    {persistedMissing ? (
                      <MenuItem value={persistedId} disabled>
                        {activity!.contractor.code} — {activity!.contractor.name} (current)
                      </MenuItem>
                    ) : null}
                  </TextField>
                )}
              />
              <TextField
                label="What are you working on?"
                placeholder="e.g. Pipe installation"
                {...register("title")}
                error={!!errors.title}
                helperText={errors.title?.message}
              />
              <TextField
                label="Description"
                placeholder="Add details..."
                multiline
                rows={2}
                {...register("description")}
              />
              {reuseSource ? (
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Based on: {reuseSource.title} · {relativeDayLabel(reuseSource.workDate, defaultDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Review today&apos;s values
                  </Typography>
                </Stack>
              ) : null}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <TextField select fullWidth label="Status" {...field}>
                        {["active", "attention", "blocked", "completed"].map((status) => (
                          <MenuItem key={status} value={status}>
                            {status[0]!.toUpperCase() + status.slice(1)}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Workers"
                    placeholder="0"
                    {...register("manpower")}
                    error={!!errors.manpower}
                    helperText={errors.manpower?.message ?? (reuseSource ? "Review today's value" : undefined)}
                  />
                </Grid>
              </Grid>
              <Controller
                name="progressPercent"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2">{field.value ?? 0}%</Typography>
                    </Stack>
                    <Slider
                      size="small"
                      value={typeof field.value === "number" ? field.value : 0}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(_, value) => field.onChange(value)}
                      aria-label="Progress percent"
                    />
                    {errors.progressPercent ? (
                      <Typography color="error" variant="caption">
                        {errors.progressPercent.message}
                      </Typography>
                    ) : null}
                  </Box>
                )}
              />
              <Accordion
                variant="outlined"
                disableGutters
                elevation={0}
                defaultExpanded={!!defaultPartId || !!activity?.facilityPart}
                sx={{ "&:before": { display: "none" } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon fontSize="small" />}>
                  <Typography variant="body2" color="text.secondary">
                    More details
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={2}>
                    {parts.isLoading ? <LinearProgress aria-label="Loading optional Work Parts" /> : null}
                    {parts.isError ? (
                      <Alert severity="warning">
                        Work Parts could not be loaded. Whole-Facility work is still available.{" "}
                        <Button variant="text" onClick={() => void parts.refetch()}>
                          Retry
                        </Button>
                      </Alert>
                    ) : null}
                    {partOptions.length > 0 || selectedPartId || parts.isError ? (
                      <Controller
                        name="facilityPartId"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            select
                            label="Work Part (optional)"
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                            value={field.value ?? ""}
                            onChange={(event) => {
                              setPartNotice(null);
                              field.onChange(event.target.value || null);
                            }}
                            error={!!errors.facilityPartId}
                            helperText={errors.facilityPartId?.message}
                          >
                            <MenuItem value="">Whole Facility</MenuItem>
                            {selectedPartId && !partOptions.some((part) => part.id === selectedPartId) ? (
                              <MenuItem value={selectedPartId} disabled>
                                Selected Work Part (loading / unavailable)
                              </MenuItem>
                            ) : null}
                            {partOptions.map((part) => (
                              <MenuItem key={part.id} value={part.id}>
                                {part.code} — {part.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      />
                    ) : null}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          type="time"
                          label="Start time"
                          {...register("startTime")}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          type="time"
                          label="End time"
                          {...register("endTime")}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </AccordionDetails>
              </Accordion>
              {duplicate && dupAcked ? (
                <Alert severity="warning">
                  A similar Activity already exists for this date (“{duplicate.title}”). Press Save Activity again to
                  save anyway.
                </Alert>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: "max(8px, env(safe-area-inset-bottom))" }}>
          <Button variant="text" color="inherit" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || contractors.isError || contractors.isLoading || facilities.isLoading}
          >
            {isSubmitting ? "Saving…" : "Save Activity"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
