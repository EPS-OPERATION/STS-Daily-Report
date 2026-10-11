import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Controller, useForm } from "react-hook-form";
import { useRegister } from "../hooks/use-register.js";
import { registerFormSchema, type RegisterFormValues } from "../schemas/register.schema.js";
import { ContractorPicker } from "./contractor-picker.js";

export function RegisterForm({ onBack }: { onBack: () => void }) {
  const mutation = useRegister();
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema), defaultValues: { email: "", username: "", password: "", confirmPassword: "", contractorChoice: "", companyName: "" },
  });
  if (mutation.isSuccess) return <Stack spacing={2}><Alert severity="success">ส่งคำขอสมัครแล้ว รอผู้ดูแลระบบอนุมัติ</Alert><Typography color="text.secondary">Your account will be available after EPS reviews your request.</Typography><Button onClick={onBack}>Back to sign in</Button></Stack>;
  return (
    <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit((v) => mutation.mutate({
      email: v.email, username: v.username, password: v.password,
      ...(v.contractorChoice === "other" ? { companyName: v.companyName } : { contractorId: v.contractorChoice }),
    }))}>
      {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
      <TextField label="Work email" type="email" autoComplete="email" {...register("email")} error={Boolean(errors.email)} helperText={errors.email?.message} />
      <TextField label="Username" autoComplete="username" {...register("username")} error={Boolean(errors.username)} helperText={errors.username?.message ?? "3–20 characters: a–z, 0–9, dot, underscore or hyphen"} />
      <TextField label="Password" type="password" autoComplete="new-password" {...register("password")} error={Boolean(errors.password)} helperText={errors.password?.message ?? "At least 8 characters"} />
      <TextField label="Confirm password" type="password" autoComplete="new-password" {...register("confirmPassword")} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword?.message} />
      <Controller control={control} name="contractorChoice" render={({ field }) => <ContractorPicker value={field.value} onChange={field.onChange} error={errors.contractorChoice?.message} disabled={mutation.isPending} />} />
      {watch("contractorChoice") === "other" && <TextField label="Company name" autoComplete="organization" {...register("companyName")} error={Boolean(errors.companyName)} helperText={errors.companyName?.message} />}
      <Button type="submit" size="large" disabled={mutation.isPending}>{mutation.isPending ? "Submitting…" : "Request account"}</Button>
    </Stack>
  );
}
