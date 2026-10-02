import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DAILY_SITE_MARKER_ICON_KEYS } from "@sts/shared";
import { z } from "zod";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { useFacilities } from "@/hooks/use-site-operations.js";
import { autoSelectContractorId, writableContractorIds } from "@/features/site-activity/utils/activity-contractor.js";
import type { DailySiteMarker, CreateDailySiteMarkerInput } from "../types/daily-site-marker.types.js";
import { dailySiteMarkerApi } from "../api/daily-site-marker.api.js";
import { dailySiteMarkerIcons } from "./daily-site-marker-icons.js";

const formSchema = z.object({
  iconKey: z.enum(DAILY_SITE_MARKER_ICON_KEYS),
  comment: z.string().trim().min(1, "Add a short note").max(2000),
  contractorId: z.string().uuid("Choose a Contractor"),
  facilityId: z.string().uuid().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

export function DailySiteMarkerDialog({
  projectId,
  siteMapViewId,
  workDate,
  position,
  marker,
  onClose,
  onSaved,
}: {
  projectId: string;
  siteMapViewId: string;
  workDate: string;
  position: { x: number; y: number };
  marker?: DailySiteMarker;
  onClose: () => void;
  onSaved: (row: DailySiteMarker, isNew: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const me = useMe();
  const contractors = useProjectContractors(projectId);
  const facilities = useFacilities(projectId, "all");
  const projectContractors = useMemo(() => contractors.data?.data ?? [], [contractors.data]);
  const membershipIds = useMemo(() => me.data?.data.contractors.map((row) => row.id) ?? [], [me.data]);
  const contractorOptions = useMemo(() => {
    if (!me.data) return [];
    const ids = writableContractorIds({
      isAdmin: false,
      membershipIds,
      projectIds: projectContractors.map((row) => row.id),
    });
    return projectContractors.filter((row) => ids.includes(row.id));
  }, [me.data, membershipIds, projectContractors]);
  const initialContractorId = marker?.contractor.id ?? "";
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      iconKey: marker?.iconKey ?? "other",
      comment: marker?.comment ?? "",
      contractorId: initialContractorId,
      facilityId: marker?.facility?.id ?? null,
    },
  });
  const selectedContractorId = useWatch({ control: form.control, name: "contractorId" });
  const setValue = form.setValue;

  useEffect(() => {
    if (marker || selectedContractorId || !me.data || !contractors.data) return;
    const id = autoSelectContractorId({
      isNew: true,
      current: "",
      membershipIds,
      projectIds: projectContractors.map((row) => row.id),
    });
    if (id) setValue("contractorId", id, { shouldValidate: true });
  }, [marker, selectedContractorId, me.data, contractors.data, membershipIds, projectContractors, setValue]);

  const submit = form.handleSubmit(async (values) => {
    const input: CreateDailySiteMarkerInput = {
      siteMapViewId,
      workDate,
      contractorId: values.contractorId,
      iconKey: values.iconKey,
      comment: values.comment,
      x: position.x,
      y: position.y,
      facilityId: values.facilityId,
    };
    try {
      const result = marker
        ? await dailySiteMarkerApi.update(marker.id, {
            iconKey: values.iconKey,
            comment: values.comment,
            ...(position.x !== marker.x || position.y !== marker.y ? { x: position.x, y: position.y } : {}),
            ...(values.facilityId !== marker.facility?.id ? { facilityId: values.facilityId } : {}),
          })
        : await dailySiteMarkerApi.create(projectId, input);
      await onSaved(result.data, !marker);
      onClose();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Site Marker could not be saved." });
    }
  });

  const canSubmit =
    !contractors.isLoading && !contractors.isError && !me.isLoading && !me.isError && contractorOptions.length > 0;
  const iconKey = useWatch({ control: form.control, name: "iconKey" });
  const Icon = dailySiteMarkerIcons[iconKey].Icon;

  return (
    <Dialog
      open
      onClose={() => !form.formState.isSubmitting && onClose()}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{marker ? "Edit Site Marker" : "Add Site Marker"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {form.formState.errors.root?.message ? (
              <Alert severity="error">{form.formState.errors.root.message}</Alert>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Top View · {workDate}
            </Typography>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                What is happening here?
              </Typography>
              <Controller
                name="iconKey"
                control={form.control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    exclusive
                    value={field.value}
                    onChange={(_, value) => value && field.onChange(value)}
                    aria-label="Site Marker type"
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      width: "100%",
                      gap: 0.75,
                      "& .MuiToggleButtonGroup-grouped": {
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      },
                    }}
                  >
                    {DAILY_SITE_MARKER_ICON_KEYS.map((key) => {
                      const option = dailySiteMarkerIcons[key];
                      const OptionIcon = option.Icon;
                      return (
                        <ToggleButton key={key} value={key} aria-label={option.label} sx={{ minHeight: 52, px: 0.5 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <OptionIcon fontSize="small" />
                            <Typography variant="caption">{option.label}</Typography>
                          </Stack>
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                )}
              />
              {form.formState.errors.iconKey ? (
                <Typography color="error" variant="caption">
                  Choose a type.
                </Typography>
              ) : null}
            </Box>
            <TextField
              label="Comment"
              placeholder="e.g. Crane operating until 17:00."
              multiline
              minRows={3}
              maxRows={6}
              required
              inputProps={{ maxLength: 2000 }}
              {...form.register("comment")}
              error={!!form.formState.errors.comment}
              helperText={form.formState.errors.comment?.message ?? "Up to 2000 characters"}
            />
            {contractors.isError || me.isError ? (
              <Alert severity="error">Contractor access could not be loaded. Retry the page before submitting.</Alert>
            ) : null}
            {facilities.isError ? (
              <Alert severity="warning">
                Facilities could not be loaded. You can still submit without linking a Facility.
              </Alert>
            ) : null}
            {!contractors.isLoading && !me.isLoading && contractorOptions.length === 0 ? (
              <Alert severity="warning">
                Your account has no active Contractor membership assigned to this Project.
              </Alert>
            ) : null}
            {marker ? (
              <TextField label="Contractor" value={marker.contractor.name} disabled />
            ) : (
              <Controller
                name="contractorId"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Contractor"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    error={!!form.formState.errors.contractorId}
                    helperText={
                      form.formState.errors.contractorId?.message ??
                      (contractorOptions.length === 1 ? "Auto-selected from your account" : undefined)
                    }
                  >
                    {contractorOptions.length !== 1 ? <MenuItem value="">Choose Contractor</MenuItem> : null}
                    {contractorOptions.map((row) => (
                      <MenuItem key={row.id} value={row.id}>
                        {row.code} — {row.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}
            <Controller
              name="facilityId"
              control={form.control}
              render={({ field }) => (
                <Autocomplete
                  options={facilities.data?.data ?? []}
                  value={facilities.data?.data.find((row) => row.id === field.value) ?? null}
                  loading={facilities.isLoading}
                  getOptionLabel={(row) => row.name}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, facility) => field.onChange(facility?.id ?? null)}
                  renderInput={(params) => <TextField {...params} label="Facility (optional)" />}
                />
              )}
            />
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <Icon fontSize="small" />
              <Typography variant="caption">
                The marker is shared with Project users and stays on this work date.
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit || form.formState.isSubmitting}>
            {marker ? "Save changes" : "Add Marker"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
