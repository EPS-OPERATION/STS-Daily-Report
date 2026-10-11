import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/features/auth/components/auth-shell.js";
import { PasswordField } from "@/features/auth/components/password-field.js";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password.js";
import { newPasswordSchema, type NewPasswordValues } from "@/features/auth/schemas/register.schema.js";

export function ResetPasswordPage() {
  const [params, setParams] = useSearchParams();
  const token = params.get("token");
  const mutation = useResetPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });
  return <AuthShell><Stack spacing={2}>
    <Typography variant="h4">Reset password</Typography>
    {mutation.isSuccess ? <><Alert severity="success">Password updated. Sign in with your new password.</Alert><Button component={RouterLink} to="/login">Back to sign in</Button></> : !token ? <><Alert severity="error">This reset link is invalid. Please contact your administrator for a new link.</Alert><Button component={RouterLink} to="/login">Back to sign in</Button></> : <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(async (v) => {
      try { await mutation.mutateAsync({ token, password: v.password }); setParams({}, { replace: true }); } catch { /* The mutation error is displayed below. */ }
    })}>
      <Typography color="text.secondary">Choose a new password for your account.</Typography>
      {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
      <PasswordField label="New password" autoComplete="new-password" {...register("password")} error={Boolean(errors.password)} helperText={errors.password?.message ?? "At least 8 characters"} />
      <PasswordField label="Confirm password" autoComplete="new-password" {...register("confirmPassword")} error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword?.message} />
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Updating…" : "Update password"}</Button>
    </Stack>}
  </Stack></AuthShell>;
}
