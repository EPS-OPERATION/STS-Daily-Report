import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useForm } from "react-hook-form";
import { useProjectContractors } from "@/features/projects/hooks/use-projects.js";
import { useCreateSiteActivity } from "../hooks/use-create-site-activity.js";
import { siteActivityFormSchema, type SiteActivityFormValues } from "../schemas/site-activity.schema.js";
import type { ZoneOption } from "../types/site-plan.types.js";

const STATUSES = ["active", "attention", "blocked", "completed"] as const;

// Project comes from context — the dialog never asks for it.
export function ActivityDialog({
  open,
  onClose,
  projectId,
  zones,
  defaultZoneId,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  zones: ZoneOption[];
  defaultZoneId?: string | null;
  defaultDate: string;
}) {
  const mutation = useCreateSiteActivity(projectId);
  const contractorsQuery = useProjectContractors(projectId);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SiteActivityFormValues>({
    resolver: zodResolver(siteActivityFormSchema),
    defaultValues: {
      workDate: defaultDate,
      zoneId: defaultZoneId ?? "",
      contractorId: "",
      title: "",
      description: "",
      status: "active",
      manpower: 0,
      progressPercent: 0,
      startTime: "",
      endTime: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync({
      zoneId: values.zoneId,
      contractorId: values.contractorId,
      workDate: values.workDate,
      title: values.title.trim(),
      description: values.description?.trim() || undefined,
      status: values.status,
      manpower: values.manpower,
      progressPercent: values.progressPercent,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
    });
    reset();
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add site activity</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {mutation.isError && (
            <Alert severity="error">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to create activity"}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Work date"
                type="date"
                {...register("workDate")}
                error={Boolean(errors.workDate)}
                helperText={errors.workDate?.message}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel id="sa-status">Status</InputLabel>
                    <Select labelId="sa-status" label="Status" {...field}>
                      {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="zoneId"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                    <InputLabel id="sa-zone">Zone *</InputLabel>
                    <Select labelId="sa-zone" label="Zone *" {...field}>
                      {zones.map((z) => (
                        <MenuItem key={z.id} value={z.id}>
                          {z.code} — {z.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error ? (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    ) : null}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="contractorId"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                    <InputLabel id="sa-contractor">Contractor *</InputLabel>
                    <Select labelId="sa-contractor" label="Contractor *" {...field}>
                      {(contractorsQuery.data?.data ?? []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error ? (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    ) : null}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Activity title *"
                placeholder="Boiler Structure Installation"
                {...register("title")}
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description" multiline rows={2} {...register("description")} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Manpower"
                type="number"
                {...register("manpower")}
                error={Boolean(errors.manpower)}
                helperText={errors.manpower?.message}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Progress"
                type="number"
                {...register("progressPercent")}
                error={Boolean(errors.progressPercent)}
                helperText={errors.progressPercent?.message}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="Start" type="time" {...register("startTime")} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField label="End" type="time" {...register("endTime")} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting || mutation.isPending}>
          Save activity
        </Button>
      </DialogActions>
    </Dialog>
  );
}
