import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useCurrentProject } from "@/features/projects/index.js";
import { useRegister } from "../hooks/use-register.js";
import { registerFormSchema, type RegisterFormValues } from "../schemas/register.schema.js";
import { ContractorPicker } from "./contractor-picker.js";
import { PasswordField } from "./password-field.js";

export function RegisterForm({ onBack }: { onBack: () => void }) {
  const mutation = useRegister();
  const { projectId, projects } = useCurrentProject();
  // Step 1: user details. Step 2: project & contractor. Each step is short enough
  // to fit a laptop viewport without scrolling.
  const [step, setStep] = useState(0);
  const { register, handleSubmit, control, watch, trigger, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema), defaultValues: { email: "", username: "", password: "", confirmPassword: "", contractorChoice: "", companyName: "" },
  });
  const projectName = projects.find((p) => p.id === projectId)?.name ?? "";
  if (mutation.isSuccess) return <Stack spacing={2}><Alert severity="success">ส่งคำขอสมัครแล้ว รอผู้ดูแลระบบอนุมัติ</Alert><Typography color="text.secondary">Your account will be available after EPS reviews your request.</Typography><Button onClick={onBack}>Back to sign in</Button></Stack>;
  const next = async () => {
    if (await trigger(["email", "username", "password", "confirmPassword"])) setStep(1);
  };
  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit((v) => mutation.mutate({
      email: v.email, username: v.username, password: v.password,
      ...(v.contractorChoice === "other" ? { companyName: v.companyName } : { contractorId: v.contractorChoice }),
    }))}>
      <Stepper activeStep={step} sx={{ mb: 0.5 }}>
        <Step><StepLabel>User details</StepLabel></Step>
        <Step><StepLabel>Project &amp; contractor</StepLabel></Step>
      </Stepper>
      {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
      {step === 0 ? (
        <Stack spacing={2}>
          <TextField label="Work email" type="email" autoComplete="email" {...register("email")} error={Boolean(errors.email)} helperText={errors.email?.message} />
          <TextField label="Username" autoComplete="username" {...register("username")} error={Boolean(errors.username)} helperText={errors.username?.message ?? "3–20 characters: a–z, 0–9, . _ -"} />
          <PasswordField label="Password" autoComplete="new-password" {...register("password")} error={Boolean(errors.password)} helperText={errors.password?.message ?? "At least 8 characters"} />
          <PasswordField label="Confirm password" autoComplete="new-password" {...register("confirmPassword")} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword?.message} />
          <Button type="button" variant="contained" fullWidth onClick={() => void next()}>Next</Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Select your contractor for this project — or choose "Other" if your company is not listed yet.
          </Typography>
          <TextField label="Project" value={projectName || "—"} disabled />
          <Controller control={control} name="contractorChoice" render={({ field }) => <ContractorPicker value={field.value} onChange={field.onChange} projectId={projectId ?? undefined} error={errors.contractorChoice?.message} disabled={mutation.isPending} />} />
          {watch("contractorChoice") === "other" && <TextField label="Company name" autoComplete="organization" {...register("companyName")} error={Boolean(errors.companyName)} helperText={errors.companyName?.message} />}
          <Stack direction="row" spacing={1.5}>
            <Button type="button" color="inherit" disabled={mutation.isPending} onClick={() => setStep(0)}>Back</Button>
            <Button type="submit" variant="contained" fullWidth disabled={mutation.isPending}>{mutation.isPending ? "Submitting…" : "Request account"}</Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
