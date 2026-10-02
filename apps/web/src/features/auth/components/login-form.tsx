import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { authApi } from "../api/auth.api.js";
import { useLogin } from "../hooks/use-login.js";
import { loginFormSchema, type LoginFormValues } from "../schemas/login.schema.js";

export function LoginForm() {
  const mutation = useLogin();
  // Hosted demo asks for a shared access code; local dev does not.
  const config = useQuery({ queryKey: ["auth", "config"], queryFn: () => authApi.config(), staleTime: Infinity, retry: false });
  const needsCode = Boolean(config.data?.data.accessCodeRequired);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ email: values.email, accessCode: needsCode ? values.accessCode : undefined });
  });

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
      {mutation.isError ? (
        <Alert severity="error">
          {mutation.error instanceof Error ? mutation.error.message : "Unable to sign in with this email."}
        </Alert>
      ) : null}
      <TextField
        label="Work email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        {...register("email")}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      {needsCode ? (
        <TextField label="Access code" type="password" autoComplete="current-password" {...register("accessCode")} />
      ) : null}
      <Button type="submit" size="large" disabled={isSubmitting || mutation.isPending} fullWidth>
        Continue
      </Button>
      {import.meta.env.DEV ? (
        <Typography variant="caption" color="text.secondary" align="center">
          Development authentication — email lookup only, no password. Never use in production.
        </Typography>
      ) : null}
    </Stack>
  );
}
