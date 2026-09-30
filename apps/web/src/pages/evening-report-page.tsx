import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { FieldBottomNav } from "@/components/field/field-bottom-nav.js";
import { ZONE_OPTIONS } from "@/mock/site-data.js";

const STEPS = ["Work", "People", "Permits", "QAQC", "Review"] as const;

const schema = z.object({
  zone: z.string().min(1, "Select a zone"),
  activity: z.string().min(1, "Select an activity"),
  progress: z.coerce.number().min(0).max(100),
  description: z.string().max(1000).optional(),
  workers: z.coerce.number().min(1, "Enter worker count"),
  supervisor: z.string().min(1, "Enter supervisor name"),
  permitsUsed: z.enum(["no", "yes"]),
  permitType: z.string().optional(),
  materialReceived: z.enum(["no", "yes"]),
  materialType: z.string().optional(),
  materialQty: z.string().optional(),
  qaqcRequested: z.enum(["no", "yes"]),
  qaqcType: z.string().optional(),
});

type Values = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof Values)[]> = {
  0: ["zone", "activity", "progress"],
  1: ["workers", "supervisor"],
  2: ["permitsUsed", "permitType", "materialReceived"],
  3: ["qaqcRequested", "qaqcType"],
  4: [],
};

const YESTERDAY: Partial<Values> = {
  zone: ZONE_OPTIONS[1],
  activity: "Structure Installation",
  progress: 62,
  workers: 30,
  supervisor: "Somchai P.",
};

export function EveningReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      zone: "",
      activity: "",
      progress: 0,
      description: "",
      workers: 0,
      supervisor: "",
      permitsUsed: "no",
      permitType: "",
      materialReceived: "no",
      materialType: "",
      materialQty: "",
      qaqcRequested: "no",
      qaqcType: "",
    },
  });
  const { control, register, trigger, watch, setValue, handleSubmit } = form;
  const permitsUsed = watch("permitsUsed");
  const materialReceived = watch("materialReceived");
  const qaqcRequested = watch("qaqcRequested");
  const values = watch();

  const next = async () => {
    const ok = await trigger(STEP_FIELDS[step] ?? []);
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = handleSubmit(() => setDone(true));

  if (done) {
    return (
      <Box sx={{ maxWidth: { xs: 480, md: 680 }, mx: "auto", pb: 10 }}>
        <Card>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Stack spacing={2} alignItems="center">
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48 }} />
              <Typography variant="h4">Evening report submitted</Typography>
              <Typography variant="body1" color="text.secondary">
                {values.zone} · {values.activity} · {values.progress}% · {values.workers} workers
              </Typography>
              <Button onClick={() => navigate("/field")} size="large">
                Back to home
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <FieldBottomNav />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: { xs: 480, md: 680 }, mx: "auto", pb: 10 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="Back" onClick={() => (step === 0 ? navigate("/field") : setStep(step - 1))}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, textAlign: "center" }}>
          <Typography variant="h5">Evening Report</Typography>
          <Typography variant="caption" color="text.secondary">
            Step {step + 1} of {STEPS.length}
          </Typography>
        </Box>
        <Box sx={{ width: 40 }} />
      </Stack>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: 11 } }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          {step === 0 ? (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">Today&apos;s Work</Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    (Object.keys(YESTERDAY) as (keyof Values)[]).forEach((k) =>
                      setValue(k, YESTERDAY[k] as never, { shouldValidate: true }),
                    );
                  }}
                >
                  Copy from yesterday
                </Button>
              </Stack>
              <Controller
                name="zone"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                    <InputLabel id="er-zone">Zone *</InputLabel>
                    <Select labelId="er-zone" label="Zone *" {...field}>
                      {ZONE_OPTIONS.map((z) => (
                        <MenuItem key={z} value={z}>
                          {z}
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
              <Controller
                name="activity"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                    <InputLabel id="er-activity">Activity *</InputLabel>
                    <Select labelId="er-activity" label="Activity *" {...field}>
                      {[
                        "Structure Installation",
                        "Electrical Installation",
                        "Concrete Pour",
                        "Cable Tray Installation",
                      ].map((a) => (
                        <MenuItem key={a} value={a}>
                          {a}
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
              <TextField
                label="Progress *"
                type="number"
                {...register("progress")}
                error={Boolean(form.formState.errors.progress)}
                helperText={form.formState.errors.progress?.message}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
              <TextField
                label="Description"
                multiline
                rows={3}
                placeholder="Enter work description…"
                {...register("description")}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Photos
                </Typography>
                <Button variant="outlined" component="label" fullWidth sx={{ borderStyle: "dashed", minHeight: 48 }}>
                  + Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    aria-label="Add site photos"
                    onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
                  />
                </Button>
                {photoCount > 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    {photoCount} photo{photoCount === 1 ? "" : "s"} attached
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          ) : null}

          {step === 1 ? (
            <Stack spacing={2}>
              <Typography variant="h5">People</Typography>
              <TextField
                label="Workers on site *"
                type="number"
                {...register("workers")}
                error={Boolean(form.formState.errors.workers)}
                helperText={form.formState.errors.workers?.message}
              />
              <TextField
                label="Supervisor *"
                placeholder="Supervisor name"
                {...register("supervisor")}
                error={Boolean(form.formState.errors.supervisor)}
                helperText={form.formState.errors.supervisor?.message}
              />
            </Stack>
          ) : null}

          {step === 2 ? (
            <Stack spacing={2}>
              <Typography variant="h5">Permits & Materials</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Work permits used today?
                </Typography>
                <Controller
                  name="permitsUsed"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={field.value}
                      onChange={(_, v) => v && field.onChange(v)}
                    >
                      <ToggleButton value="no">No</ToggleButton>
                      <ToggleButton value="yes">Yes</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
              </Box>
              {permitsUsed === "yes" ? (
                <Controller
                  name="permitType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel id="er-permit">Permit type</InputLabel>
                      <Select labelId="er-permit" label="Permit type" {...field}>
                        {["Work at Height", "Hot Work", "Heavy Lift", "Confined Space", "General Work"].map((p) => (
                          <MenuItem key={p} value={p}>
                            {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              ) : null}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Material received today?
                </Typography>
                <Controller
                  name="materialReceived"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={field.value}
                      onChange={(_, v) => v && field.onChange(v)}
                    >
                      <ToggleButton value="no">No</ToggleButton>
                      <ToggleButton value="yes">Yes</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
              </Box>
              {materialReceived === "yes" ? (
                <Stack spacing={2}>
                  <TextField label="Material type" {...register("materialType")} />
                  <TextField label="Quantity" {...register("materialQty")} />
                </Stack>
              ) : null}
            </Stack>
          ) : null}

          {step === 3 ? (
            <Stack spacing={2}>
              <Typography variant="h5">QAQC</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  QAQC inspection requested?
                </Typography>
                <Controller
                  name="qaqcRequested"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      value={field.value}
                      onChange={(_, v) => v && field.onChange(v)}
                    >
                      <ToggleButton value="no">No</ToggleButton>
                      <ToggleButton value="yes">Yes</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
              </Box>
              {qaqcRequested === "yes" ? (
                <Controller
                  name="qaqcType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel id="er-qaqc">Inspection type</InputLabel>
                      <Select labelId="er-qaqc" label="Inspection type" {...field}>
                        {["Welding Inspection", "Concrete Slump Test", "Cable Continuity", "Torque Verification"].map(
                          (q) => (
                            <MenuItem key={q} value={q}>
                              {q}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>
                  )}
                />
              ) : null}
            </Stack>
          ) : null}

          {step === 4 ? (
            <Stack spacing={1.5}>
              <Typography variant="h5">Review</Typography>
              <Alert severity="info">Check the summary before submitting.</Alert>
              {(
                [
                  ["Zone", values.zone || "-"],
                  ["Activity", values.activity || "-"],
                  ["Progress", `${values.progress ?? 0}%`],
                  ["Workers", `${values.workers ?? 0} · ${values.supervisor || "-"}`],
                  ["Permits", values.permitsUsed === "yes" ? values.permitType || "Yes" : "None"],
                  [
                    "Materials",
                    values.materialReceived === "yes"
                      ? `${values.materialType || "-"} ${values.materialQty || ""}`.trim()
                      : "None",
                  ],
                  ["QAQC", values.qaqcRequested === "yes" ? values.qaqcType || "Requested" : "None"],
                  ["Photos", `${photoCount} attached`],
                ] as const
              ).map(([k, v]) => (
                <Stack key={k} direction="row" justifyContent="space-between" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {k}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
                    {v}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : null}
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          size="large"
          onClick={() => (step === 0 ? navigate("/field") : setStep(step - 1))}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="large" fullWidth onClick={next}>
            Continue
          </Button>
        ) : (
          <Button size="large" fullWidth onClick={submit}>
            Submit report
          </Button>
        )}
      </Stack>

      <FieldBottomNav />
    </Box>
  );
}
