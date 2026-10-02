import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useFacilities, useFacilityParts } from "@/hooks/use-site-operations.js";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { siteOperationsApi } from "@/services/site-operations.api.js";
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
  onClose,
  onSaved,
}: {
  projectId: string;
  defaultDate: string;
  defaultFacilityId?: string | null;
  defaultPartId?: string | null;
  activity?: SiteActivityRecord;
  onClose: () => void;
  onSaved: (record: SiteActivityRecord) => Promise<void>;
}) {
  const facilities = useFacilities(projectId, "all"),
    contractors = useProjectContractors(projectId);
  const [error, setError] = useState<string | null>(null);
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
      facilityId: activity?.facility?.id ?? defaultFacilityId ?? "",
      facilityPartId: activity?.facilityPart?.id ?? defaultPartId ?? null,
      contractorId: activity?.contractor.id ?? "",
      workDate: activity?.workDate ?? defaultDate,
      title: activity?.title ?? "",
      description: activity?.description ?? "",
      status: activity?.status ?? "active",
      manpower: activity?.manpower ?? 0,
      progressPercent: activity?.progressPercent ?? 0,
      startTime: activity?.startTime ?? "",
      endTime: activity?.endTime ?? "",
    },
  });
  const facilityId = useWatch({ control, name: "facilityId" }),
    selectedPartId = useWatch({ control, name: "facilityPartId" });
  const parts = useFacilityParts(projectId, facilityId || null, "active");
  const partOptions = parts.data?.data ?? [];
  useEffect(() => {
    if (contractors.data && !contractors.data.data.some((row) => row.id === activity?.contractor.id) && activity)
      setValue("contractorId", "");
  }, [contractors.data, activity, setValue]);
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
    setError(null);
    try {
      const result = await siteOperationsApi.saveActivity(projectId, activity?.id ?? null, {
        ...values,
        startTime: values.startTime || (activity ? null : undefined),
        endTime: values.endTime || (activity ? null : undefined),
      });
      await onSaved(result.data);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Activity could not be saved.");
    }
  });
  return (
    <Dialog open onClose={() => !isSubmitting && onClose()} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{activity ? "Edit Activity" : "Add Activity"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
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
                    onChange={(event) => field.onChange(event.target.value || null)}
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
                  label="Contractor"
                  {...field}
                  value={contractors.data?.data.some((row) => row.id === field.value) ? field.value : ""}
                  error={!!errors.contractorId}
                  helperText={errors.contractorId?.message}
                >
                  <MenuItem value="">Choose Contractor</MenuItem>
                  {contractors.data?.data.map((row) => (
                    <MenuItem key={row.id} value={row.id}>
                      {row.code} — {row.name}
                    </MenuItem>
                  ))}
                </TextField>
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
            <TextField
              label="Activity title"
              {...register("title")}
              error={!!errors.title}
              helperText={errors.title?.message}
            />
            <TextField label="Description" multiline rows={2} {...register("description")} />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField select label="Status" {...field}>
                  {["active", "attention", "blocked", "completed"].map((status) => (
                    <MenuItem key={status} value={status}>
                      {status[0]!.toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Workers"
                  {...register("manpower")}
                  error={!!errors.manpower}
                  helperText={errors.manpower?.message}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Progress (%)"
                  {...register("progressPercent")}
                  error={!!errors.progressPercent}
                  helperText={errors.progressPercent?.message}
                />
              </Grid>
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
        </DialogContent>
        <DialogActions>
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
