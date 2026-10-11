import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FocusEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { useCurrentProject } from "@/features/projects/index.js";
import { useRegister } from "../hooks/use-register.js";
import { registerFormSchema, type RegisterFormValues } from "../schemas/register.schema.js";
import { ContractorPicker } from "./contractor-picker.js";
import { PasswordField } from "./password-field.js";
import { PasswordRequirements } from "./password-requirements.js";

export function RegisterForm({ onBack }: { onBack: () => void }) {
  const mutation = useRegister();
  const { projectId } = useCurrentProject();
  // The requirements checklist pops up while a password field is focused/typed and
  // collapses again on blur, so the form fits a laptop screen without scrolling.
  const [pwActive, setPwActive] = useState(false);
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema), defaultValues: { email: "", username: "", password: "", confirmPassword: "", contractorChoice: "", companyName: "" },
  });
  const passwordReg = register("password");
  const confirmReg = register("confirmPassword");
  if (mutation.isSuccess) return <Stack spacing={2}><Alert severity="success">ส่งคำขอสมัครแล้ว รอผู้ดูแลระบบอนุมัติ</Alert><Typography color="text.secondary">Your account will be available after EPS reviews your request.</Typography><Button onClick={onBack}>Back to sign in</Button></Stack>;
  // Two columns on md+ screens so the whole form (and the submit button) fits a
  // laptop viewport without scrolling; a single column on mobile.
  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit((v) => mutation.mutate({
      email: v.email, username: v.username, password: v.password,
      ...(v.contractorChoice === "other" ? { companyName: v.companyName } : { contractorId: v.contractorChoice }),
    }))}>
      {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <TextField label="Work email" type="email" autoComplete="email" {...register("email")} error={Boolean(errors.email)} helperText={errors.email?.message} />
            <TextField label="Username" autoComplete="username" {...register("username")} error={Boolean(errors.username)} helperText={errors.username?.message ?? "3–20 characters: a–z, 0–9, . _ -"} />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              {...passwordReg}
              onFocus={() => setPwActive(true)}
              onBlur={(e: FocusEvent<HTMLInputElement>) => { setPwActive(false); void passwordReg.onBlur(e); }}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <Collapse in={pwActive} unmountOnExit>
              <PasswordRequirements password={watch("password")} />
            </Collapse>
            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              {...confirmReg}
              onFocus={() => setPwActive(true)}
              onBlur={(e: FocusEvent<HTMLInputElement>) => { setPwActive(false); void confirmReg.onBlur(e); }}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Controller control={control} name="contractorChoice" render={({ field }) => <ContractorPicker value={field.value} onChange={field.onChange} projectId={projectId ?? undefined} error={errors.contractorChoice?.message} disabled={mutation.isPending} />} />
            {watch("contractorChoice") === "other" && <TextField label="Company name" autoComplete="organization" {...register("companyName")} error={Boolean(errors.companyName)} helperText={errors.companyName?.message} />}
          </Stack>
        </Grid>
      </Grid>
      <Button type="submit" size="large" fullWidth disabled={mutation.isPending}>{mutation.isPending ? "Submitting…" : "Request account"}</Button>
    </Stack>
  );
}
